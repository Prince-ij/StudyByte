import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { notify } from "../../reducers/notificationReducer";
import { logIn } from "../../reducers/userReducer";
import services from "../../services";
import logo from "../../assets/studyByteLogo.png";
import { useNavigate, Link } from "react-router-dom";

const SignIn = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await services.login({
        email: form.email.trim(),
        password: form.password,
      });
      if (data.token) services.setToken(data.token);
      dispatch(logIn(data));
      dispatch(notify({ type: "success", message: "Signed in successfully" }));

      try {
        const dashboardUrl = `${window.location.origin}/dashboard`;
        window.open(dashboardUrl, "_blank", "noopener,noreferrer");
      } catch (err) {
        console.warn("Could not open dashboard in new tab", err);
      }

      navigate("/dashboard");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Login failed";
      dispatch(notify({ type: "danger", message: msg }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh" }}
    >
      <div
        className="card shadow-sm"
        style={{ maxWidth: 540, width: "100%", borderRadius: 12 }}
      >
        <div className="row g-0">
          <div className="col-12 p-4">
            <div className="d-flex align-items-center mb-3">
              <img
                src={logo}
                alt="StudyByte"
                style={{ width: 48, height: 48, marginRight: 12 }}
              />
              <div>
                <h5 className="mb-0">StudyByte</h5>
                <small className="text-muted">
                  Turn PDFs into interactive courses
                </small>
              </div>
            </div>

            <h5 className="mb-3">Sign in to your account</h5>
            <form onSubmit={handleSubmit} autoComplete="off">
              {/* hidden dummy input to prevent browser autofill */}
              <input
                type="text"
                name="prevent-autofill"
                autoComplete="off"
                style={{ display: "none" }}
              />

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
                  placeholder="Your password"
                  autoComplete="new-password"
                />
              </div>

              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </div>

              <div className="text-center mt-3 small text-muted">
                Don't have an account? <Link to="/signup">Create one</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
