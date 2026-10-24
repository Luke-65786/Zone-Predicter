import React, { useId } from "react";
import { ArrowLeft } from "lucide-react";

export function ToolPage({ title, accent, description, icon: Icon, children }) {
  return (
    <div className="page-shell comp-page">
      <a href="#home" className="back-home">
        <ArrowLeft size={14} /> All tools
      </a>
      <section className="intro comp-intro">
        <div>
          <div className="eyebrow">
            <Icon size={14} /> FORTNITE COMPETITIVE
          </div>
          <h1>
            {title} <span>{accent}</span>
          </h1>
          <p>{description}</p>
        </div>
      </section>
      {children}
    </div>
  );
}
export function Field({ label, children, hint, ...props }) {
  const id = useId();
  const attributes = {
    id,
    "aria-labelledby": `${id}-label`,
    "aria-describedby": hint ? `${id}-hint` : undefined,
  };
  return (
    <label className="comp-field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      {children ? (
        React.cloneElement(children, attributes)
      ) : (
        <input {...props} {...attributes} />
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </label>
  );
}
export function NumberField(props) {
  return (
    <Field type="number" inputMode="numeric" min="0" step="1" {...props} />
  );
}
export function StorageNote({ saved }) {
  return (
    <p className="comp-storage">
      {saved
        ? "Saved in this browser. Keep using the same browser to return to your work."
        : "Browser storage is unavailable. Changes work for this session but will not survive a reload."}
    </p>
  );
}
export function Metric({ label, value, testId }) {
  return (
    <div className="comp-metric">
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
    </div>
  );
}
