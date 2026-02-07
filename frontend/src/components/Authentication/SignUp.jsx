import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { notify } from "../../reducers/notificationReducer";
import services from "../../services";
import logo from "../../assets/studyByteLogo.png";
import { useNavigate, Link } from "react-router-dom";

const SignUp = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.username.trim()) {
      dispatch(notify({ type: "danger", message: "Username is required" }));
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      dispatch(
        notify({ type: "danger", message: "Please enter a valid email" })
      );
      return false;
    }
    if (form.password.length < 6) {
      dispatch(
        notify({
          type: "danger",
          message: "Password must be at least 6 characters",
        })
      );
      return false;
    }
    if (form.password !== form.confirm) {
      dispatch(notify({ type: "danger", message: "Passwords do not match" }));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.debug("SignUp.handleSubmit called", { form });
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      await services.createUser(payload);
      dispatch(
        notify({ type: "success", message: "Account created. Please sign in." })
      );

      // Redirect user to sign-in page after successful signup
      navigate("/signin", { replace: true });
    } catch (err) {
      console.error("SignUp error", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Signup failed";
      dispatch(notify({ type: "danger", message: msg }));
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const len = form.password.length;
    if (len > 10) return "strong";
    if (len >= 6) return "medium";
    return "weak";
  };

  return (
    <div
      className="container d-flex align-items-center justify-content-center mt-3"
      style={{ minHeight: "100vh" }}
    >
      <div
        className="card shadow-lg"
        style={{ maxWidth: 1000, borderRadius: 12, overflow: "hidden" }}
      >
        <div className="row g-0">
          <div
            className="col-md-6 bg-primary text-white d-flex flex-column p-4"
            style={{ background: "linear-gradient(135deg,#5b8ef8,#7f58ff)" }}
          >
            <div className="d-flex align-items-center mb-3">
              <img
                src={logo}
                alt="StudyByte"
                style={{ width: 56, height: 56, marginRight: 12 }}
              />
              <div>
                <h4 className="mb-0">StudyByte</h4>
                <small className="text-white-50">Learn smarter, faster</small>
              </div>
            </div>

            <div className="mt-3">
              <h5>Turn PDFs into interactive courses</h5>
              <p className="mb-3" style={{ opacity: 0.95 }}>
                StudyByte converts your study material into bite-sized chapters
                with quizzes so you can learn actively. Upload any PDF, get an
                automated course, and track progress with chapter quizzes and a
                final exam.
              </p>

              <ul className="list-unstyled small" style={{ lineHeight: 1.8 }}>
                <li>• Automatic course generation from PDFs</li>
                <li>• Chapter quizzes to reinforce learning</li>
                <li>• Final exam to validate mastery</li>
                <li>• Enroll and track progress</li>
              </ul>

              <div className="mt-auto">
                <small className="text-white-50">
                  Already have an account?
                </small>
                <div>
                  <Link
                    to="/signin"
                    className="btn btn-outline-light btn-sm mt-2"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 p-4">
            <div className="p-3">
              <h4 className="mb-3">Create your account</h4>
              <form onSubmit={handleSubmit} autoComplete="off">
                {/* hidden dummy input to prevent browser autofill */}
                <input
                  type="text"
                  name="prevent-autofill"
                  autoComplete="off"
                  style={{ display: "none" }}
                />

                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Choose a display name"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="you@domain.com"
                    autoComplete="off"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                  <div className="mt-2 d-flex align-items-center">
                    <small className="text-muted me-2">Strength:</small>
                    <span
                      className={`badge ${
                        passwordStrength() === "strong"
                          ? "bg-success"
                          : passwordStrength() === "medium"
                          ? "bg-warning text-dark"
                          : "bg-secondary"
                      }`}
                    >
                      {passwordStrength()}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Confirm password</label>
                  <input
                    name="confirm"
                    type="password"
                    value={form.confirm}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Sign up"}
                  </button>
                </div>

                <div className="text-center mt-3 small text-muted">
                  By signing up you agree to our Terms & Privacy.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
