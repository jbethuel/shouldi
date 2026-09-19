import { type AssessResponse, MAX_RESUME_CHARS } from "@shouldi/shared";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { StepBar } from "../../components/StepBar";
import { requestAssessment } from "../../lib/api";
import { MESSAGES } from "../../lib/messages";
import { type JobPage, readActiveTab } from "../../lib/page";
import { redact } from "../../lib/redact";
import { getInstallId, loadCachedResult, loadProfile, removeCachedResult, saveCachedResult } from "../../lib/storage";

/** Shorter text than this cannot be a job posting, so the extension does not send it. */
const MIN_JOB_CHARS = 100;

type View =
  | { kind: "loading" }
  | { kind: "message"; message: string; action?: "settings" }
  | { kind: "ready"; page: JobPage }
  | { kind: "assessing"; page: JobPage }
  | { kind: "result"; page: JobPage; response: AssessResponse }
  | { kind: "error"; page: JobPage; message: string };

export function App() {
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    void (async () => {
      const profile = await loadProfile();
      if (!profile.resumeText.trim()) return setView({ kind: "message", message: MESSAGES.noResume, action: "settings" });

      const page = await readActiveTab();
      if (!page) return setView({ kind: "message", message: MESSAGES.cannotRead });
      if (page.text.length < MIN_JOB_CHARS) return setView({ kind: "message", message: MESSAGES.notJobPosting });

      const cached = await loadCachedResult(page.tabId, page.url, page.text);
      setView(cached ? { kind: "result", page, response: cached } : { kind: "ready", page });
    })();
  }, []);

  const assess = useCallback(async (page: JobPage) => {
    setView({ kind: "assessing", page });
    const profile = await loadProfile();
    const resumeText = redact(profile.resumeText, profile.removalName).slice(0, MAX_RESUME_CHARS);
    const outcome = await requestAssessment({ resumeText, jobText: page.text }, await getInstallId());
    if (!outcome.ok) return setView({ kind: "error", page, message: outcome.message });
    await saveCachedResult(page.tabId, { url: page.url, jobText: page.text, response: outcome.response });
    setView({ kind: "result", page, response: outcome.response });
  }, []);

  const assessAgain = useCallback(
    async (page: JobPage) => {
      await removeCachedResult(page.tabId);
      await assess(page);
    },
    [assess],
  );

  return (
    <div className="popup">
      <header className="popup-header">
        <span className="wordmark">Should I Apply?</span>
        <button type="button" className="btn-link small" onClick={() => void browser.runtime.openOptionsPage()}>
          Settings
        </button>
      </header>
      <main className="popup-body" aria-live="polite">
        {view.kind === "loading" && <p className="muted">Reading this page…</p>}
        {view.kind === "message" && (
          <div className="notice">
            <p>{view.message}</p>
            {view.action === "settings" && (
              <button type="button" className="btn-primary" onClick={() => void browser.runtime.openOptionsPage()}>
                Add your resume
              </button>
            )}
          </div>
        )}
        {(view.kind === "ready" || view.kind === "assessing") && (
          <JobPreview page={view.page} busy={view.kind === "assessing"} onAssess={() => void assess(view.page)} />
        )}
        {view.kind === "error" && (
          <div className="notice">
            <p>{view.message}</p>
            <button type="button" className="btn-secondary" onClick={() => void assess(view.page)}>
              Try again
            </button>
          </div>
        )}
        {view.kind === "result" && (
          <Result response={view.response} onAssessAgain={() => void assessAgain(view.page)} />
        )}
      </main>
    </div>
  );
}

function JobPreview({ page, busy, onAssess }: { page: JobPage; busy: boolean; onAssess: () => void }) {
  return (
    <section className="preview">
      <div className="preview-meta">
        <span className="eyebrow">Job text</span>
        <span className="badge">{page.source === "selection" ? "Your selection" : "This page"}</span>
      </div>
      {page.title && <h1 className="job-title">{page.title}</h1>}
      <div className="job-text" tabIndex={0}>
        {page.text}
      </div>
      {page.cut && <p className="muted small">{MESSAGES.textCut}</p>}
      <button type="button" className="btn-primary wide" disabled={busy} onClick={onAssess}>
        {busy ? "Assessing…" : "Assess"}
      </button>
      <p className="muted small">We send your resume without your contact details. Our server does not keep it.</p>
    </section>
  );
}

function Result({ response, onAssessAgain }: { response: AssessResponse; onAssessAgain: () => void }) {
  if (response.kind === "not_job_posting") {
    return (
      <div className="notice">
        <p>{response.message}</p>
      </div>
    );
  }
  return (
    <section className="result">
      <div className="overall">
        <h1 className="overall-label">{response.overall.label}</h1>
        <StepBar steps={response.overall.steps} label="Overall match" large />
      </div>
      <ul className="criteria">
        {response.criteria.map((c) => (
          <li key={c.id} className={c.stated ? undefined : "unstated"}>
            <div className="criterion-head">
              <span className="criterion-name">{c.name}</span>
              {c.steps !== null && <StepBar steps={c.steps} label={c.name} />}
            </div>
            <p className="criterion-sentence">{c.sentence}</p>
          </li>
        ))}
      </ul>
      {response.tip && <p className="tip">{response.tip}</p>}
      <button type="button" className="btn-link small" onClick={onAssessAgain}>
        Assess again
      </button>
    </section>
  );
}
