import express from "express";
import multer from "multer";
import mongoose from "mongoose";

const courseRouter = express.Router();

import Course from "../models/Courses.js";
import Chapter from "../models/Chapters.js";
import Quiz from "../models/Quizzes.js";
import Exam from "../models/Exams.js";
import Enrollment from "../models/Enrollments.js";

import { extractPdfText } from "../utils/pdfExtractor.js";
import {
  summarizeText,
  generateCourseMetadata,
  generateChapters,
  generateQuizForChapter,
  generateFinalExam,
} from "../utils/generator.js"; // updated generator

const upload = multer();

courseRouter.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Extract PDF text and summarize
    const pdfText = await extractPdfText(req.file.buffer, 50); // max 50 pages
    console.log("PDF text extracted, length:", pdfText.length);

    const summary = await summarizeText(pdfText);

    // Generate everything in memory before touching the DB
    const courseMeta = await generateCourseMetadata(summary);
    const chaptersData = await generateChapters(summary);

    // generate quizzes for each chapter in memory
    const chaptersQuizzes = [];
    for (const ch of chaptersData) {
      const quizData = await generateQuizForChapter(ch.content);
      chaptersQuizzes.push(quizData.questions || []);
    }

    // generate final exam in memory
    const examData = await generateFinalExam(summary);

    // ensure authenticated before DB transaction
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Authentication required to enroll user" });
    }

    // Start a mongoose session and perform all writes inside a transaction
    const session = await mongoose.startSession();
    let createdCourse = null;
    let savedChapters = [];
    let enrollment = null;

    try {
      await session.withTransaction(async () => {
        // Create course
        const courseDocs = await Course.create([courseMeta], { session });
        createdCourse = courseDocs[0];

        // Create chapters and quizzes
        savedChapters = [];
        for (let i = 0; i < chaptersData.length; i++) {
          const ch = chaptersData[i];
          const chapterDocs = await Chapter.create(
            [
              {
                course: createdCourse._id,
                chapter_number: ch.chapter_number,
                title: ch.title,
                content: ch.content,
              },
            ],
            { session }
          );

          const chapterDoc = chapterDocs[0];
          savedChapters.push(chapterDoc);

          const quizQuestions = chaptersQuizzes[i] || [];
          await Quiz.create(
            [
              {
                chapter: chapterDoc._id,
                questions: quizQuestions,
              },
            ],
            { session }
          );
        }

        // Create exam
        await Exam.create(
          [
            {
              course: createdCourse._id,
              questions: examData.questions || [],
            },
          ],
          { session }
        );

        // Create or update enrollment
        const existingEnrollment = await Enrollment.findOne({
          user: req.user._id,
          course: createdCourse._id,
        }).session(session);

        if (existingEnrollment) {
          if (existingEnrollment.status === "not started") {
            existingEnrollment.status = "in progress";
            await existingEnrollment.save({ session });
          }
          enrollment = existingEnrollment;
        } else {
          const enrollmentDocs = await Enrollment.create(
            [
              {
                user: req.user._id,
                course: createdCourse._id,
                status: "in progress",
                completed_chapters: [],
                chapter_quiz_results: [],
                final_exam_results: [],
              },
            ],
            { session }
          );
          enrollment = enrollmentDocs[0];
        }
      });

      // If we reach here, transaction committed
      res.json({
        message: "Course generated successfully",
        course: createdCourse,
        chapters: savedChapters,
        enrollment,
      });
    } catch (txErr) {
      console.error("Transaction failed, aborting:", txErr);
      res.status(500).json({ error: txErr.message || "Transaction failed" });
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to generate course" });
  }
});

// Fetch courses the authenticated user is enrolled in
courseRouter.get("/my-courses", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Find enrollments for the user and populate course + chapter references
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate("course")
      .populate("completed_chapters")
      .populate({
        path: "chapter_quiz_results.chapter",
        model: "Chapter",
      });

    res.json({ enrollments });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err.message || "Failed to fetch user courses" });
  }
});

// Fetch chapters for a course
courseRouter.get("/:courseId/chapters", async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const chapters = await Chapter.find({ course: courseId }).sort({
      chapter_number: 1,
    });

    // Fetch existing quizzes for these chapters
    const chapterIds = chapters.map((c) => c._id);
    const quizzes = await Quiz.find({ chapter: { $in: chapterIds } });
    const quizMap = new Map(quizzes.map((q) => [q.chapter.toString(), q]));

    const missingChapters = chapters.filter(
      (c) => !quizMap.has(c._id.toString())
    );
    if (missingChapters.length) {
      const created = await Promise.all(
        missingChapters.map((c) =>
          Quiz.create({ chapter: c._id, questions: [] })
        )
      );
      for (const q of created) quizMap.set(q.chapter.toString(), q);
    }

    const result = chapters.map((c) => {
      const q = quizMap.get(c._id.toString());
      return {
        id: c._id,
        chapter_number: c.chapter_number,
        title: c.title,
        content: c.content,
        quiz: q
          ? { id: q._id, questions: q.questions }
          : { id: null, questions: [] },
      };
    });

    res.json({ chapters: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch chapters" });
  }
});

// submit chapter quiz
courseRouter.post("/chapters/:chapterId/quiz/submit", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { chapterId } = req.params;
    const { answers } = req.body; // expected: array of selected option indices

    if (!Array.isArray(answers)) {
      return res
        .status(400)
        .json({ error: "`answers` must be an array of selected indices" });
    }

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) return res.status(404).json({ error: "Chapter not found" });

    const quiz = await Quiz.findOne({ chapter: chapter._id });
    if (!quiz)
      return res.status(404).json({ error: "Quiz not found for chapter" });

    const total = quiz.questions.length;
    let correctCount = 0;

    const details = quiz.questions.map((q, idx) => {
      const provided = typeof answers[idx] === "number" ? answers[idx] : null;
      const correct = q.correct_index;
      const isCorrect = provided === correct;
      if (isCorrect) correctCount++;
      return {
        questionIndex: idx,
        provided,
        correct,
        isCorrect,
      };
    });

    const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
    const passed = score >= 70; // passing threshold

    // Find user's enrollment for this course
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: chapter.course,
    });
    if (!enrollment) {
      return res
        .status(400)
        .json({ error: "User is not enrolled in this course" });
    }

    // Update or insert chapter quiz result
    const existingIndex = enrollment.chapter_quiz_results.findIndex(
      (r) => r.chapter.toString() === chapter._id.toString()
    );
    if (existingIndex !== -1) {
      enrollment.chapter_quiz_results[existingIndex].score = score;
      enrollment.chapter_quiz_results[existingIndex].passed = passed;
    } else {
      enrollment.chapter_quiz_results.push({
        chapter: chapter._id,
        score,
        passed,
      });
    }

    // Mark chapter completed if passed
    if (
      passed &&
      !enrollment.completed_chapters.some(
        (c) => c.toString() === chapter._id.toString()
      )
    ) {
      enrollment.completed_chapters.push(chapter._id);
    }

    // If all chapters completed, mark enrollment completed
    const courseChapterCount = await Chapter.countDocuments({
      course: chapter.course,
    });
    if (enrollment.completed_chapters.length >= courseChapterCount) {
      enrollment.status = "completed";
    } else if (enrollment.status === "not started") {
      enrollment.status = "in progress";
    }

    await enrollment.save();

    res.json({ score, passed, total, correctCount, details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to submit quiz" });
  }
});

// Fetch final exam for a course
courseRouter.get("/:courseId/exam", async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "Authentication required" });

    const { courseId } = req.params;

    // Ensure user is enrolled
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: courseId,
    });
    if (!enrollment)
      return res
        .status(403)
        .json({ error: "User not enrolled in this course" });

    const exam = await Exam.findOne({ course: courseId });
    if (!exam)
      return res.status(404).json({ error: "Exam not found for course" });

    // Do not expose correct answers
    const questions = exam.questions.map((q) => ({
      question: q.question,
      options: q.options,
    }));

    res.json({ exam: { id: exam._id, questions } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch exam" });
  }
});

// submit exam
courseRouter.post("/:courseId/exam/submit", async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "Authentication required" });

    const { courseId } = req.params;
    const { answers } = req.body; // expected: array of selected option indices

    if (!Array.isArray(answers)) {
      return res
        .status(400)
        .json({ error: "`answers` must be an array of selected indices" });
    }

    // Ensure user is enrolled
    const enrollment = await Enrollment.findOne({
      user: req.user._id,
      course: courseId,
    });
    if (!enrollment)
      return res
        .status(403)
        .json({ error: "User not enrolled in this course" });

    const exam = await Exam.findOne({ course: courseId });
    if (!exam)
      return res.status(404).json({ error: "Exam not found for course" });

    const total = exam.questions.length;
    let correctCount = 0;

    const details = exam.questions.map((q, idx) => {
      const provided = typeof answers[idx] === "number" ? answers[idx] : null;
      const correct = q.correct_index;
      const isCorrect = provided === correct;
      if (isCorrect) correctCount++;
      return { questionIndex: idx, provided, correct, isCorrect };
    });

    const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
    const passed = score >= 70; // passing threshold

    // record final exam result
    enrollment.final_exam_results.push({ score, passed });

    // if passed, mark enrollment completed
    if (passed) {
      enrollment.status = "completed";
    } else if (enrollment.status === "not started") {
      enrollment.status = "in progress";
    }

    await enrollment.save();

    res.json({ score, passed, total, correctCount, details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to submit exam" });
  }
});

export default courseRouter;
