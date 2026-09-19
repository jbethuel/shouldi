import { MAX_RESUME_CHARS } from "@shouldi/shared";
import { type ChangeEvent, type ClipboardEvent, useEffect, useMemo, useState } from "react";
import { RESUME_NOTICE } from "../../lib/messages";
import { pdfToText } from "../../lib/pdf";
import { findName, redact } from "../../lib/redact";
import { deleteAllData, loadProfile, type Profile, saveProfile } from "../../lib/storage";

const API_URL = (import.meta.env.WXT_API_URL as string | undefined) ?? "https://shouldiapply.vercel.app";

type Status = { kind: "idle" } | { kind: "reading" } | { kind: "saved" } | { kind: "deleted" } | { kind: "error"; message: string };

export function App() {
  const [profile, setProfile] = useState<Profile>({ resumeText: "", removalName: "" });
  const [saved, setSaved] = useState<Profile>({ resumeText: "", removalName: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void loadProfile().then((p) => {
      setProfile(p);
      setSaved(p);
    });
  }, []);

  const dirty = profile.resumeText !== saved.resumeText || profile.removalName !== saved.removalName;
  const preview = useMemo(
    () => redact(profile.resumeText, profile.removalName).slice(0, MAX_RESUME_CHARS),
    [profile.resumeText, profile.removalName],
  );

  /** Clean a new resume at once: find the name at the top, then remove it and the contact details. */
  function addResume(text: string) {
    setProfile((p) => {
      const removalName = findName(text) || p.removalName;
      return { resumeText: redact(text, removalName), removalName };
    });
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    // A resume pasted into the empty box is a new resume. Other pastes are edits.
    if (profile.resumeText.trim()) return;
    event.preventDefault();
    addResume(event.clipboardData.getData("text"));
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus({ kind: "reading" });
    try {
      const text = await pdfToText(file);
      if (!text) throw new Error("empty");
      addResume(text);
      setStatus({ kind: "idle" });
    } catch {
      setStatus({
        kind: "error",
        message: "We could not read text from this PDF. Copy the text from your resume and paste it below.",
      });
    }
  }

  async function onSave() {
    const next = { resumeText: profile.resumeText.trim(), removalName: profile.removalName };
    await saveProfile(next);
    setProfile(next);
    setSaved(next);
    setStatus({ kind: "saved" });
  }

  async function onDelete() {
    await deleteAllData();
    const empty = { resumeText: "", removalName: "" };
    setProfile(empty);
    setSaved(empty);
    setConfirmDelete(false);
    setStatus({ kind: "deleted" });
  }

  const length = profile.resumeText.length;

  return (
    <main className="settings">
      <header>
        <p className="brand-line">Should I Apply?</p>
        <h1>Settings</h1>
      </header>

      <section className="field">
        <label htmlFor="resume">Your resume</label>
        <div className="pdf-pick">
          <span className="pdf-pick-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <div className="pdf-pick-text">
            <p className="pdf-pick-title">{RESUME_NOTICE.title}</p>
            <p className="muted small">{RESUME_NOTICE.local}</p>
            <p className="muted small">{RESUME_NOTICE.sent}</p>
          </div>
          <label className="btn-secondary file-button">
            Choose a PDF
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => void onFile(e)} />
          </label>
        </div>
        {status.kind === "reading" && <p className="muted small">Reading the PDF on this computer…</p>}
        {status.kind === "error" && <p className="small error">{status.message}</p>}
        <textarea
          id="resume"
          rows={16}
          value={profile.resumeText}
          onChange={(e) => setProfile((p) => ({ ...p, resumeText: e.target.value }))}
          onPaste={onPaste}
          placeholder="Paste your resume here."
        />
        <div className="resume-foot muted small">
          <span>Review and adjust your resume here. Remove your address and other personal details.</span>
          <span>
            {length.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()} characters
            {length > MAX_RESUME_CHARS && " — only the first part is used."}
          </span>
        </div>
      </section>

      <div className="actions">
        <button type="button" className="btn-primary" disabled={!dirty} onClick={() => void onSave()}>
          Save
        </button>
        {status.kind === "saved" && !dirty && <span className="muted small">Saved on this computer.</span>}
        {status.kind === "deleted" && <span className="muted small">Your data is deleted.</span>}
      </div>

      <details className="send-preview">
        <summary>Show the text that we send</summary>
        <pre>{preview || "No resume yet."}</pre>
      </details>

      <section className="danger">
        <h2>Delete all my data</h2>
        <p className="muted small">This deletes your resume, your name, and your install ID from this computer.</p>
        {confirmDelete ? (
          <div className="actions">
            <button type="button" className="btn-danger" onClick={() => void onDelete()}>
              Delete
            </button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
            Delete all my data
          </button>
        )}
      </section>

      <footer className="muted small">
        <a href={`${API_URL}/privacy`} target="_blank" rel="noreferrer">
          Privacy policy
        </a>
      </footer>
    </main>
  );
}
