import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import services from "../../services";
import { useDispatch } from "react-redux";
import { notify } from "../../reducers/notificationReducer";

const QuizPage = () => {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [chapter, setChapter] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [completed, setCompleted] = useState(false);

  const formatScore = (r) => {
    if (!r) return "";
    const s = Number(r.score);
    const t = Number(r.total);
    if (Number.isFinite(s) && Number.isFinite(t) && t > 0) {
      if (s <= t) return `${s}/${t}`;
      // if score already percent-ish
      if (s >= 0 && s <= 100) return `${Math.round(s)}%`;
      return `${Math.round((s / t) * 100)}%`;
    }
    if (Number.isFinite(s)) {
      if (s >= 0 && s <= 100) return `${Math.round(s)}%`;
      return String(s);
    }
    return String(r.score || "");
  };

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, chapterId]);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const data = await services.getCourseChapters(courseId);
      const ch = (data.chapters || []).find(
        (c) => String(c._id || c.id) === String(chapterId)
      );
      if (!ch) {
        dispatch(notify({ type: "danger", message: "Chapter not found" }));
        navigate(-1);
        return;
      }
      setChapter(ch);

      const qs = (ch.quiz && ch.quiz.questions) || [];
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));

      // check enrollments to detect prior quiz results
      try {
        const me = await services.getMyCourses();
        const enrollments = (me && me.enrollments) || [];
        const enrollment = enrollments.find((en) => {
          const cid =
            en && en.course && (en.course.id || en.course._id || en.course);
          return String(cid) === String(courseId);
        });
        if (enrollment && Array.isArray(enrollment.chapter_quiz_results)) {
          const found = enrollment.chapter_quiz_results.find((r) => {
            const rid =
              r && r.chapter && (r.chapter.id || r.chapter._id || r.chapter);
            return String(rid) === String(chapterId);
          });
          if (found) {
            const existing = {
              score: found.score || 0,
              total: qs.length,
              passed: Boolean(found.passed),
              details: found.details || null,
            };
            setResult(existing);
            if (existing.passed) setCompleted(true);

            // populate answers from details if present
            if (existing.details && existing.details.length) {
              const prev = new Array(qs.length).fill(null);
              existing.details.forEach((d) => {
                const qi = d.questionIndex;
                if (typeof d.provided === "number") prev[qi] = d.provided;
                else if (typeof d.provided === "string") {
                  const opts = (qs[qi] && qs[qi].options) || [];
                  const idx = opts.findIndex((o) => o === d.provided);
                  if (idx !== -1) prev[qi] = idx;
                }
              });
              setAnswers(prev);
            }
          }
        }
      } catch (enErr) {
        console.debug("Could not load enrollments:", enErr?.message || enErr);
      }
    } catch (err) {
      console.error(err);
      dispatch(notify({ type: "danger", message: "Failed to load quiz" }));
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (qIndex, optIndex) => {
    if (completed || (result && result.passed)) return;
    const n = [...answers];
    n[qIndex] = optIndex;
    setAnswers(n);
  };

  const allAnswered = answers.length > 0 && answers.every((a) => a !== null);

  const handleSubmit = async () => {
    if (completed || (result && result.passed)) return;
    if (!allAnswered) {
      dispatch(
        notify({ type: "danger", message: "Please answer all questions" })
      );
      return;
    }
    setSubmitting(true);
    try {
      const resp = await services.submitChapterQuiz(chapterId, answers);
      setResult(resp);
      if (resp && resp.passed) setCompleted(true);
      dispatch(
        notify({ type: "success", message: `Score: ${formatScore(resp)}` })
      );
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e.message ||
        "Submission failed";
      dispatch(notify({ type: "danger", message: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container py-5">Loading quiz...</div>;
  if (!chapter) return null;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">{chapter.title || "Chapter Quiz"}</h4>
          <small className="text-muted">
            {chapter.title ? `Quiz for ${chapter.title}` : "Chapter quiz"}
          </small>
        </div>
        <div>
          <button
            className="btn btn-sm btn-secondary me-2"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="card p-3">No quiz available for this chapter.</div>
      ) : (
        <div className="card shadow-sm p-3">
          {questions.map((q, i) => (
            <div key={i} className="mb-3">
              <div className="fw-semibold mb-2">
                {i + 1}. {q.question}
              </div>
              <div>
                {(q.options || []).map((opt, oi) => (
                  <div className="form-check" key={oi}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`q-${i}`}
                      id={`q-${i}-opt-${oi}`}
                      checked={answers[i] === oi}
                      onChange={() => handleSelect(i, oi)}
                      disabled={completed || (result && result.passed)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`q-${i}-opt-${oi}`}
                    >
                      {opt}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="d-flex align-items-center">
            {!result && (
              <button
                className="btn btn-primary me-3"
                disabled={!allAnswered || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Submitting..." : "Submit answers"}
              </button>
            )}

            {result && !result.passed && (
              <>
                <button
                  className="btn btn-warning me-3"
                  disabled={!allAnswered || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Retrying..." : "Retry"}
                </button>
                <div>
                  <strong>{formatScore(result)}</strong> —{" "}
                  <span className="text-danger">Failed</span>
                </div>
              </>
            )}

            {result && result.passed && (
              <div className="text-success">
                You have already completed and passed this quiz.
              </div>
            )}
          </div>

          {result && result.details && (
            <div className="mt-3">
              <h6>Details</h6>
              <ul className="list-unstyled small">
                {result.details.map((d, idx) => (
                  <li
                    key={idx}
                    className={d.isCorrect ? "text-success" : "text-danger"}
                  >
                    Q{d.questionIndex + 1}:{" "}
                    {d.isCorrect ? "Correct" : "Incorrect"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizPage;
