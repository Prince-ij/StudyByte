import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import services from "../../services";
import { useDispatch } from "react-redux";
import { notify } from "../../reducers/notificationReducer";

const FinalExam = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadExam = async () => {
    setLoading(true);
    try {
      const data = await services.getFinalExam(courseId);
      const qs =
        (data && data.questions) ||
        (data && data.exam && data.exam.questions) ||
        [];
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));

      // try to load existing final exam result from enrollments
      try {
        const me = await services.getMyCourses();
        const enrollments = me?.enrollments || [];
        const enrollment = enrollments.find((en) => {
          const cid =
            en && en.course && (en.course.id || en.course._id || en.course);
          return String(cid) === String(courseId);
        });
        if (enrollment && Array.isArray(enrollment.final_exam_results)) {
          const found = enrollment.final_exam_results[0] || null;
          if (found) {
            const existing = {
              score: found.score || found.total || 0,
              total: found.total || qs.length || 0,
              passed: Boolean(found.passed),
              details: found.details || null,
            };
            setResult(existing);
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
      } catch (e) {
        console.debug(
          "Could not load final exam result from enrollments",
          e?.message || e
        );
      }
    } catch (e) {
      console.error(e);
      dispatch(
        notify({ type: "danger", message: "Failed to load final exam" })
      );
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (qIndex, optIndex) => {
    if (result && result.passed) return;
    const n = [...answers];
    n[qIndex] = optIndex;
    setAnswers(n);
  };

  const allAnswered = answers.length > 0 && answers.every((a) => a !== null);

  const handleSubmit = async () => {
    if (result && result.passed) return;
    if (!allAnswered)
      return dispatch(
        notify({ type: "danger", message: "Please answer all questions" })
      );
    setSubmitting(true);
    try {
      const resp = await services.submitFinalExam(courseId, answers);
      setResult(resp);
      dispatch(
        notify({
          type: "success",
          message: `Final exam: ${resp.score}/${resp.total}`,
        })
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

  if (loading)
    return <div className="container py-5">Loading final exam...</div>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Final Exam</h4>
          <small className="text-muted">Final exam for this course</small>
        </div>
        <div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="card p-3">No final exam available.</div>
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
                      name={`fe-q-${i}`}
                      id={`fe-q-${i}-opt-${oi}`}
                      checked={answers[i] === oi}
                      onChange={() => handleSelect(i, oi)}
                      disabled={result && result.passed}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`fe-q-${i}-opt-${oi}`}
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
                {submitting ? "Submitting..." : "Submit final exam"}
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
                  <strong>
                    {result.score}/{result.total}
                  </strong>{" "}
                  — <span className="text-danger">Failed</span>
                </div>
              </>
            )}

            {result && result.passed && (
              <div className="text-success">
                You have already completed and passed the final exam.
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

export default FinalExam;
