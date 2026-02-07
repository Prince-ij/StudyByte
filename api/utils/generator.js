import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// ------------------- INITIALIZE LLM -------------------
const llm = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
  temperature: 0.2,
});

// ------------------- SCHEMAS -------------------
const CourseMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const ChapterSchema = z.object({
  chapter_number: z.number(),
  title: z.string(),
  content: z.string(),
});

const ChaptersSchema = z.array(ChapterSchema);

// Wrap chapters array in an object because the LLM structured output JSON schema
// must be a top-level object (OpenAI errors if top-level is an array).
const ChaptersOutputSchema = z.object({
  chapters: ChaptersSchema,
});

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().int().min(0).max(3),
});

const QuizSchema = z.object({
  questions: z.array(QuizQuestionSchema),
});

// ------------------- FUNCTIONS -------------------

// Summarize PDF text
export async function summarizeText(pdfText) {
  const prompt = `
Restructure the following text clearly for course content and chapter by chapter generation.

RULES:
- Keep all important concepts, formulas, and definitions
- Use simple English
- Keep it structured and readable

TEXT:
${pdfText.slice(0, 20000)}
`;

  const res = await llm.invoke([{ role: "user", content: prompt }]);
  console.log(
    "\n========== AI SUMMARY ==========\n",
    res.content,
    "\n================================\n"
  );
  return res.content;
}

// Generate course metadata
export async function generateCourseMetadata(summaryText) {
  const structuredLLM = llm.withStructuredOutput(CourseMetadataSchema);

  const result = await structuredLLM.invoke(`
Generate course metadata from this material.

RULES:
- title should be short and clear
- description should be concise, and compact in less than a paragraph.

MATERIAL:
${summaryText}
`);

  console.log(
    "\n========== AI METADATA ==========\n",
    JSON.stringify(result, null, 2),
    "\n================================\n"
  );
  return result;
}

// Generate chapters in HTML format
export async function generateChapters(summaryText) {
  const structuredLLM = llm.withStructuredOutput(ChaptersOutputSchema);

  const result = await structuredLLM.invoke(`
You are an experienced teacher with decades of experience teaching high school students.
Your Job is to take the whole material provided below and generate chapters from it.
Appropriately generate enough number of chapters as needed making sure the chapter numbers
begin with 1, 2 and so forth. make sure the content of the chapter is well explained and detailed such that any average
student can comprehend what is being taught. chapters must be atleast 3 paragraphs.

OUTPUT RULES:
- content MUST Always be html formatted and  returned as a string. Good formatting to enhance readability must be employed
- include definitions, formulas, and small examples
- make the content significantly much as needed to explain every part of the topic in detail
- do not include unnecessary information that is not related to the chapter or way advanced than what is in the material
- write in SIMPLE ENGLISH
- Explain it Vividly in such a way that any average high school student can understand
- Keep the chapter content detailed and explicit
- Provide examples that reader can be able to relate with and understand

MATERIAL:
${summaryText}
`);

  console.log(
    "\n========== AI CHAPTERS HTML OUTPUT ==========",
    JSON.stringify(result, null, 2),
    "\n===========================================\n"
  );

  // result is an object { chapters: [...] } - return the chapters array for backwards compatibility
  return result.chapters;
}

// Generate quiz for chapter (3 questions)
export async function generateQuizForChapter(chapterContent) {
  const structuredLLM = llm.withStructuredOutput(QuizSchema);

  const result = await structuredLLM.invoke(`
Create a quiz from this chapter.

RULES:
- Exactly 3 questions
- Questions must come only from the chapter content
- Each question exactly 4 options
- Only one correct answer
- Options short strings
- correct_index matches correct option

CHAPTER CONTENT:
${chapterContent}
`);

  console.log(
    "\n========== AI QUIZ OUTPUT ==========\n",
    JSON.stringify(result, null, 2),
    "\n====================================\n"
  );
  return result;
}

// Generate final exam (10 questions)
export async function generateFinalExam(summaryText) {
  const structuredLLM = llm.withStructuredOutput(QuizSchema);

  const result = await structuredLLM.invoke(`
Create a final exam from the course material.

RULES:
- Exactly 10 questions
- Each question exactly 4 options
- Only one correct answer
- correct_index 0-3
- Cover all major topics
- Do not repeat question ideas
- Options short

MATERIAL:
${summaryText}
`);

  console.log(
    "\n========== AI FINAL EXAM OUTPUT ==========\n",
    JSON.stringify(result, null, 2),
    "\n=========================================\n"
  );
  return result;
}
