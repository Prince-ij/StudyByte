import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { notify } from "../../reducers/notificationReducer";
import services from "../../services";
import { useNavigate } from "react-router-dom";
import { logOut } from "../../reducers/userReducer";

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // theme (light/dark)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "light";
    } catch (e) {
      console.log(e);
      return "light";
    }
  });

  useEffect(() => {
    // apply theme to document (Bootstrap 5.3 supports data-bs-theme)
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-bs-theme", theme);
    }
  }, [theme]);

  const user = (() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch (e) {
      console.log(e);
      return null;
    }
  })();

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const data = await services.getMyCourses();
      // API returns { enrollments: [...] }
      setCourses(data.enrollments || []);
    } catch (err) {
      console.error(err);
      dispatch(notify({ type: "danger", message: "Failed to load courses" }));
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleLogout = () => {
    dispatch(logOut());
    services.setToken("");
    navigate("/");
    window.location.reload();
  };

  // Heuristic: count occurrences of '/Type /Page' in PDF file content
  const countPdfPages = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const bytes = new Uint8Array(reader.result);
          // decode as latin1 to preserve byte values
          const text = new TextDecoder("latin1").decode(bytes);
          const matches = text.match(/\/Type\s*\/Page\b/g);
          resolve(matches ? matches.length : 0);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });

  const handleFileChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      dispatch(notify({ type: "danger", message: "Please select a PDF file" }));
      e.target.value = null;
      return;
    }

    try {
      const pages = await countPdfPages(f);
      if (pages && pages > 150) {
        dispatch(
          notify({
            type: "danger",
            message: `PDF has ${pages} pages — must be under 600 pages`,
          })
        );
        e.target.value = null;
        return;
      }
    } catch (err) {
      // if counting fails, allow upload but inform user
      console.warn("Could not determine page count", err);
      dispatch(
        notify({
          type: "info",
          message:
            "Could not determine page count locally — the server will validate. ",
        })
      );
    }

    setSelectedFile(f);
  };

  const handleUpload = async () => {
    if (!selectedFile)
      return dispatch(
        notify({ type: "danger", message: "Select a PDF to upload" })
      );
    setUploading(true);
    try {
      const data = await services.uploadPdf(selectedFile);
      dispatch(
        notify({
          type: "success",
          message: data.message || "Upload successful",
        })
      );
      // refresh list
      fetchCourses();
      // if server returned a course id, navigate to it
      const courseId = data?.course?._id || data?.course?.id;
      if (courseId) {
        navigate(`/course/${courseId}`);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Upload failed";
      dispatch(notify({ type: "danger", message: msg }));
    } finally {
      setUploading(false);
      setSelectedFile(null);
      // reset file input if present
      const el = document.getElementById("pdf-input");
      if (el) el.value = null;
    }
  };

  const onCourseClick = (enrollment) => {
    const course = enrollment.course || enrollment;
    const id = course._id || course.id;
    if (!id) return;
    navigate(`/course/${id}`);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-0">
            Welcome{user?.username ? `, ${user.username}` : ""} 👋
          </h3>
          <small className="text-muted">
            Your learning hub — PDF → interactive courses
          </small>
        </div>
        <div>
          <button
            className={`btn btn-sm me-2 ${
              theme === "dark" ? "btn-dark" : "btn-outline-secondary"
            }`}
            onClick={toggleTheme}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm p-3">
            <h5 className="mb-2">Upload a PDF</h5>
            <p className="text-muted small">
              PDF must be under 150 pages. Maximum file size enforced by server.
            </p>

            <div className="mb-2">
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </div>

            <div className="d-flex align-items-center">
              <button
                className="btn btn-primary me-2"
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <div className="text-muted small">
                {selectedFile ? selectedFile.name : "No file selected"}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm p-3">
            <h5 className="mb-2">Your courses</h5>
            {loadingCourses ? (
              <div className="text-muted">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="text-muted">
                You have no courses yet. Upload a PDF to get started.
              </div>
            ) : (
              <div className="list-group">
                {courses.map((enrollment) => {
                  const course = enrollment.course || enrollment;
                  const id =
                    course._id ||
                    course.id ||
                    Math.random().toString(36).slice(2, 9);
                  return (
                    <button
                      key={id}
                      className="list-group-item list-group-item-action"
                      onClick={() => onCourseClick(enrollment)}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">
                          {course.title || "Untitled course"}
                        </h6>
                        <small className="text-muted">
                          {enrollment.status || "enrolled"}
                        </small>
                      </div>
                      <p
                        className="mb-1 text-truncate"
                        style={{ maxWidth: "70%" }}
                      >
                        {course.description || "No description"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Quick tips</h5>
          <ul>
            <li>Upload clear PDFs (text-based) for best results.</li>
            <li>
              Each uploaded PDF will be converted into a course with chapters
              and quizzes.
            </li>
            <li>
              Server validates file size and page limits — you'll be notified on
              errors.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
