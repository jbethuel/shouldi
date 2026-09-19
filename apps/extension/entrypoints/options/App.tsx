import { MAX_RESUME_CHARS } from "@shouldi/shared";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { RESUME_NOTICE } from "../../lib/messages";
import { pdfToText } from "../../lib/pdf";
import { redact } from "../../lib/redact";
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

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus({ kind: "reading" });
    try {
      const text = await pdfToText(file);
      if (!text) throw new Error("empty");
      setProfile((p) => ({ ...p, resumeText: text }));
      setStatus({ kind: "idle" });
    } catch {
      setStatus({
        kind: "error",
        message: "We could not read text from this PDF. Copy the text from your resume and paste it below.",
      });
    }
  }

  async function onSave() {
    const next = { resumeText: profile.resumeText.trim(), removalName: profile.removalName.trim() };
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

      <section className="notice-card">
        <p>
          <strong>{RESUME_NOTICE.removeTitle}</strong> {RESUME_NOTICE.removeBody}
        </p>
        <p>
          <strong>{RESUME_NOTICE.staysTitle}</strong> {RESUME_NOTICE.staysBody}
        </p>
      </section>

      <section className="field">
        <div className="field-head">
          <label htmlFor="resume">Your resume</label>
          <label className="btn-secondary file-button">
            Choose a PDF
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => void onFile(e)} />
          </label>
        </div>
        <p className="muted small">Choose a PDF, or paste the text of your resume. You can correct the text.</p>
        {status.kind === "reading" && <p className="muted small">Reading the PDF on this computer…</p>}
        {status.kind === "error" && <p className="small error">{status.message}</p>}
        <textarea
          id="resume"
          rows={16}
          value={profile.resumeText}
          onChange={(e) => setProfile((p) => ({ ...p, resumeText: e.target.value }))}
          placeholder="Paste your resume here."
        />
        <p className="muted small">
          {length.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()} characters
          {length > MAX_RESUME_CHARS && " — only the first part is used."}
        </p>
      </section>

      <section className="field">
        <label htmlFor="name">Your name</label>
        <p className="muted small">The extension removes this name from your resume before it sends it.</p>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={profile.removalName}
          onChange={(e) => setProfile((p) => ({ ...p, removalName: e.target.value }))}
        />
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
