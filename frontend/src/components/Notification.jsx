import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { notify } from "../reducers/notificationReducer";

const Notification = () => {
  const dispatch = useDispatch();
  const { type, message } = useSelector((s) => s.notification);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      dispatch(notify({ type: "", message: "" }));
    }, 4000);
    return () => clearTimeout(t);
  }, [message, dispatch]);

  if (!message) return null;

  const bsClass =
    type === "success"
      ? "alert-success"
      : type === "danger"
      ? "alert-danger"
      : "alert-info";

  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1050 }}>
      <div
        className={`alert ${bsClass} alert-dismissible fade show`}
        role="alert"
      >
        {message}
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={() => dispatch(notify({ type: "", message: "" }))}
        ></button>
      </div>
    </div>
  );
};

export default Notification;
