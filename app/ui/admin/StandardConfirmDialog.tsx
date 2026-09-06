"use client";

import { useEffect, useId, useRef, useState } from "react";

type StandardConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  input?: {
    label: string;
    placeholder?: string;
    minLength?: number;
    requiredValue?: string;
    multiline?: boolean;
  };
  onConfirm: (value: string) => void | Promise<void>;
  onCancel: () => void;
};

export function StandardConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "إلغاء",
  tone = "default",
  busy = false,
  input,
  onConfirm,
  onCancel,
}: StandardConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const [value, setValue] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const cancel = () => {
    setValue("");
    onCancel();
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => (textareaRef.current ?? inputRef.current ?? cancelRef.current)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setValue("");
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, busy, onCancel, title]);

  if (!open) return null;

  const normalized = value.trim();
  const valid = input
    ? (input.requiredValue ? normalized === input.requiredValue : normalized.length >= (input.minLength ?? 0))
    : true;

  const confirm = () => {
    const captured = normalized;
    setValue("");
    void onConfirm(captured);
  };

  return <div className="standard-confirm-backdrop" role="presentation">
    <section
      className={`standard-confirm-dialog${tone === "danger" ? " danger" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      {input && <label htmlFor={inputId}>
        {input.label}
        {input.multiline
          ? <textarea ref={textareaRef} id={inputId} value={value} placeholder={input.placeholder} onChange={(event) => setValue(event.target.value)} disabled={busy} />
          : <input ref={inputRef} id={inputId} value={value} placeholder={input.placeholder} onChange={(event) => setValue(event.target.value)} disabled={busy} />}
      </label>}
      <div className="standard-confirm-actions">
        <button ref={cancelRef} type="button" onClick={cancel} disabled={busy}>{cancelLabel}</button>
        <button type="button" className={tone === "danger" ? "danger-action" : "primary"} onClick={confirm} disabled={busy || !valid}>{busy ? "جارٍ التنفيذ…" : confirmLabel}</button>
      </div>
    </section>
  </div>;
}
