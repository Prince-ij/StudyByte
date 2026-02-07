import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import services from "../../services";
import { useDispatch } from "react-redux";
import { notify } from "../../reducers/notificationReducer";
import DOMPurify from "dompurify";

const CoursePage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [chapters, setChapters] = useState([]);
  const [passedChapterIds, setPassedChapterIds] = useState(new Set());
  const [finalExamPassed, setFinalExamPassed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [selectedChapter, setSelectedChapter] = useState(null);

  const allPassed =
    chapters.length > 0 &&
    chapters.every((c) => passedChapterIds.has(String(c._id || c.id)));

  // sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // show sidebar side-by-side on desktop, hidden on mobile by default
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!courseId) return;
    fetchChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      // First, call getMyCourses and try to find the course metadata there
      // We'll build a local set of passed chapter ids (passedSet) and use it
      // immediately when deciding which chapters to unlock.
      let passedSet = new Set();
      try {
        const my = await services.getMyCourses();
        const enrollments = my.enrollments || [];
        const found = enrollments.find((en) => {
          const c = en.course || en;
          const cid = c?._id || c?.id || en?._id || en?.id;
          return String(cid) === String(courseId);
        });
        const courseFromEnroll = found ? found.course || found : null;
        if (courseFromEnroll) {
          setCourseTitle(
            courseFromEnroll.title || courseFromEnroll.name || "Course"
          );
          setCourseDescription(courseFromEnroll.description || "");
        }
        if (found && Array.isArray(found.chapter_quiz_results)) {
          found.chapter_quiz_results.forEach((r) => {
            if (r && r.passed) {
              const rid =
                r.chapter && (r.chapter.id || r.chapter._id || r.chapter);
              if (rid) passedSet.add(String(rid));
            }
          });
        }
        // detect final exam passed flag
        if (found && Array.isArray(found.final_exam_results)) {
          const fe = found.final_exam_results.find((f) => f && f.passed);
          if (fe) setFinalExamPassed(true);
        }
      } catch (e) {
        console.warn("Could not fetch enrollments for metadata", e);
      }

      // Now fetch chapters (this remains the source of truth for chapter list)
      const data = await services.getCourseChapters(courseId);
      const ch = data.chapters || [];
      setChapters(ch);
      // persist passed set into state so render logic can use it
      setPassedChapterIds(passedSet);

      // If we didn't get a title already, try inferring it from chapter.course
      if (!courseTitle && ch.length > 0) {
        const maybeCourse = ch[0].course || null;
        if (maybeCourse) {
          setCourseTitle(maybeCourse.title || maybeCourse.name || "Course");
          setCourseDescription(maybeCourse.description || "");
        }
      }

      // pick first unlocked chapter as selected by default
      const firstIndex = ch.findIndex((c, idx) => {
        if (idx === 0) return true;
        const prev = ch[idx - 1];
        const prevId = String(prev._id || prev.id);
        return passedSet.has(prevId);
      });
      setSelectedChapter(firstIndex >= 0 ? ch[firstIndex] : ch[0] || null);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to load chapters";
      dispatch(notify({ type: "danger", message: msg }));
    } finally {
      setLoading(false);
    }
  };

  const onSelectChapter = (ch) => {
    setSelectedChapter(ch);
    // if on mobile close sidebar after selection
    if (isMobile) setSidebarOpen(false);
  };

  const toggleSidebar = () => setSidebarOpen((s) => !s);

  const renderChapterContent = (content) => {
    if (!content) return null;
    const clean = DOMPurify.sanitize(content, { ADD_ATTR: ["target"] });
    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
  };

  // sidebar styles when shown as overlay on mobile
  const overlayStyles = {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100%",
    width: "80%",
    maxWidth: 360,
    zIndex: 1100,
    boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
    background: "white",
  };

  const backdropStyles = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.3)",
    zIndex: 1090,
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-start justify-content-between mb-3">
        <div>
          {!isMobile && (
            <>
              <h3 className="mb-1">{courseTitle}</h3>
              {courseDescription && (
                <p className="text-muted mb-0">{courseDescription}</p>
              )}
            </>
          )}
        </div>
        <div className="d-flex align-items-center">
          {/* Sidebar toggle visible on mobile */}
          <button
            className="btn btn-sm btn-outline-secondary me-2 d-md-none"
            onClick={toggleSidebar}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? "Close chapters" : "Chapters"}
          </button>

          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>

      <div className="row">
        {/* Sidebar column: on mobile it becomes overlay */}
        {sidebarOpen && (
          <div
            className={`col-md-4 mb-3 ${isMobile ? "d-none d-md-block" : ""}`}
          >
            {!isMobile && (
              <div className="card shadow-sm h-100">
                <div className="card-body p-2">
                  <h6 className="card-title">Chapters</h6>
                  {loading ? (
                    <div className="text-muted">Loading chapters...</div>
                  ) : chapters.length === 0 ? (
                    <div className="text-muted">No chapters available yet.</div>
                  ) : (
                    <div
                      className="list-group"
                      style={{ maxHeight: "70vh", overflowY: "auto" }}
                    >
                      {chapters.map((ch, idx) => {
                        const key = ch._id || ch.id;
                        const active =
                          selectedChapter &&
                          (selectedChapter._id || selectedChapter.id) === key;
                        const prev = idx > 0 ? chapters[idx - 1] : null;
                        const prevId = prev && (prev._id || prev.id);
                        const locked = !(
                          idx === 0 ||
                          (prevId && passedChapterIds.has(String(prevId)))
                        );
                        const passed = passedChapterIds.has(String(key));
                        return (
                          <button
                            key={key}
                            className={`list-group-item list-group-item-action ${
                              active ? "active" : ""
                            }`}
                            onClick={() => {
                              if (locked) {
                                // show tooltip or notification
                                dispatch(
                                  notify({
                                    type: "info",
                                    message:
                                      "Complete the previous chapter quiz to unlock.",
                                  })
                                );
                              } else {
                                onSelectChapter(ch);
                              }
                            }}
                            style={{ textAlign: "left" }}
                            disabled={locked}
                          >
                            <div className="d-flex w-100 justify-content-between">
                              <div
                                className="me-2 d-flex align-items-center"
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                <span className="me-2" aria-hidden>
                                  {locked ? "🔒" : "🔓"}
                                </span>
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {ch.title ||
                                    `Chapter ${ch.chapter_number || ""}`}
                                </span>
                                {passed && (
                                  <span
                                    className="ms-2 text-success"
                                    aria-hidden
                                  >
                                    ✅
                                  </span>
                                )}
                              </div>
                              <small className="text-muted">
                                {ch.chapter_number || ""}
                              </small>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`${sidebarOpen && !isMobile ? "col-md-8" : "col-12"}`}>
          <div className="card shadow-sm h-100">
            <div className="card-body" style={{ minHeight: "60vh" }}>
              {!selectedChapter ? (
                <div className="text-muted">
                  Select a chapter to view its content.
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="mb-1">
                        {selectedChapter.title ||
                          `Chapter ${selectedChapter.chapter_number || ""}`}
                      </h5>
                      <small className="text-muted">{`Chapter ${
                        selectedChapter.chapter_number || ""
                      }`}</small>
                    </div>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => {
                          if (!allPassed) {
                            dispatch(
                              notify({
                                type: "info",
                                message:
                                  "Complete all chapter quizzes to unlock the final exam.",
                              })
                            );
                            return;
                          }
                          if (finalExamPassed) {
                            dispatch(
                              notify({
                                type: "info",
                                message:
                                  "You have already passed the final exam.",
                              })
                            );
                            return;
                          }
                          navigate(`/course/${courseId}/final-exam`);
                        }}
                      >
                        <span className="me-2" aria-hidden>
                          {!allPassed ? "🔒" : finalExamPassed ? "✅" : "🔓"}
                        </span>
                        Take final exam
                      </button>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() =>
                          navigate(
                            `/course/${courseId}/chapter/${
                              selectedChapter._id || selectedChapter.id
                            }/quiz`
                          )
                        }
                        disabled={(() => {
                          if (!selectedChapter) return true;
                          const sid = String(
                            selectedChapter._id || selectedChapter.id
                          );
                          // if already passed, disable
                          if (passedChapterIds.has(sid)) return true;
                          // find index
                          const idx = chapters.findIndex(
                            (c) => String(c._id || c.id) === sid
                          );
                          if (idx === -1) return true;
                          if (idx === 0) return false;
                          const prev = chapters[idx - 1];
                          const prevId = prev && String(prev._id || prev.id);
                          return !(prevId && passedChapterIds.has(prevId));
                        })()}
                      >
                        Take quiz
                      </button>
                    </div>
                  </div>

                  <div>
                    {selectedChapter.content ? (
                      // render sanitized HTML
                      <div>{renderChapterContent(selectedChapter.content)}</div>
                    ) : (
                      <div className="text-muted">
                        No content available for this chapter.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay sidebar when open */}
      {isMobile && sidebarOpen && (
        <>
          <div style={backdropStyles} onClick={() => setSidebarOpen(false)} />
          <div style={overlayStyles} className="p-2">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Chapters</h6>
              <div>
                <button
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={() => setSidebarOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div style={{ overflowY: "auto", maxHeight: "80vh" }}>
              {loading ? (
                <div className="text-muted">Loading chapters...</div>
              ) : chapters.length === 0 ? (
                <div className="text-muted">No chapters available yet.</div>
              ) : (
                <div className="list-group">
                  {chapters.map((ch, idx) => {
                    const key = ch._id || ch.id;
                    const active =
                      selectedChapter &&
                      (selectedChapter._id || selectedChapter.id) === key;
                    const prev = idx > 0 ? chapters[idx - 1] : null;
                    const prevId = prev && (prev._id || prev.id);
                    const locked = !(
                      idx === 0 ||
                      (prevId && passedChapterIds.has(String(prevId)))
                    );
                    const passed = passedChapterIds.has(String(key));
                    return (
                      <button
                        key={key}
                        className={`list-group-item list-group-item-action ${
                          active ? "active" : ""
                        }`}
                        onClick={() => {
                          if (locked) {
                            // show tooltip or notification
                            dispatch(
                              notify({
                                type: "info",
                                message:
                                  "Complete the previous chapter quiz to unlock.",
                              })
                            );
                          } else {
                            onSelectChapter(ch);
                          }
                        }}
                        disabled={locked}
                      >
                        <span className="me-2" aria-hidden>
                          {locked ? "🔒" : "🔓"}
                        </span>
                        {ch.title || `Chapter ${ch.chapter_number || ""}`}
                        {passed && (
                          <span className="ms-2 text-success">✅</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CoursePage;
