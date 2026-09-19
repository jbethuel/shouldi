// @vitest-environment jsdom
import type { AssessResponse } from "@shouldi/shared";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { requestAssessment } from "../../lib/api";
import { MESSAGES } from "../../lib/messages";
import { type JobPage, readActiveTab } from "../../lib/page";
import { loadCachedResult, saveCachedResult, saveProfile } from "../../lib/storage";
import { App } from "./App";

vi.mock("../../lib/page", () => ({ readActiveTab: vi.fn() }));
vi.mock("../../lib/api", () => ({ requestAssessment: vi.fn() }));

const JOB_TEXT = `Senior Frontend Engineer. Build our merchant dashboard with React and TypeScript. ${"Details. ".repeat(10)}`;
const page: JobPage = {
  source: "page",
  title: "Senior Frontend Engineer",
  text: JOB_TEXT,
  url: "https://jobs.example/1",
  tabId: 4,
  cut: false,
};

const result: AssessResponse = {
  kind: "result",
  model: "jev-test",
  overall: { label: "Good match", steps: 3 },
  criteria: [
    { id: "skills", name: "Skills", stated: true, steps: 4, sentence: "You have most of the skills that this job asks for." },
    { id: "tasks", name: "Tasks", stated: true, steps: 3, sentence: "You have done some of the main work of this job." },
    { id: "education", name: "Education and certificates", stated: false, steps: null, sentence: "This job does not state an education requirement." },
  ],
  tip: "Do you have a skill or experience that is not in your resume? Add it, then assess the job again.",
};

beforeEach(async () => {
  fakeBrowser.reset();
  vi.mocked(readActiveTab).mockResolvedValue(page);
  vi.mocked(requestAssessment).mockResolvedValue({ ok: true, response: result });
  await saveProfile({ resumeText: "Jane Doe\njane@example.com\nSenior engineer, React.", removalName: "Jane Doe" });
});

afterEach(() => {
  cleanup();
});

describe("popup", () => {
  it("asks for a resume first and opens the settings page", async () => {
    await saveProfile({ resumeText: "  ", removalName: "" });
    const open = vi.spyOn(fakeBrowser.runtime, "openOptionsPage").mockResolvedValue();
    render(<App />);
    expect(await screen.findByText(MESSAGES.noResume)).toBeTruthy();
    expect(readActiveTab).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Add your resume" }));
    expect(open).toHaveBeenCalled();
  });

  it("says when Chrome does not let it read the page", async () => {
    vi.mocked(readActiveTab).mockResolvedValue(null);
    render(<App />);
    expect(await screen.findByText(MESSAGES.cannotRead)).toBeTruthy();
  });

  it("does not send text that is too short to be a job posting", async () => {
    vi.mocked(readActiveTab).mockResolvedValue({ ...page, text: "Sign in" });
    render(<App />);
    expect(await screen.findByText(MESSAGES.notJobPosting)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Assess" })).toBeNull();
  });

  it("shows the job text and sends nothing until the user clicks Assess", async () => {
    render(<App />);
    expect(await screen.findByText("Senior Frontend Engineer")).toBeTruthy();
    expect(screen.getByText("This page")).toBeTruthy();
    expect(screen.getByText(/merchant dashboard/)).toBeTruthy();
    expect(requestAssessment).not.toHaveBeenCalled();
  });

  it("labels selected text and says when the job text was cut", async () => {
    vi.mocked(readActiveTab).mockResolvedValue({ ...page, source: "selection", cut: true });
    render(<App />);
    expect(await screen.findByText("Your selection")).toBeTruthy();
    expect(screen.getByText(MESSAGES.textCut)).toBeTruthy();
  });

  it("sends the resume without contact details, shows the result, and keeps it for the tab", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Assess" }));

    expect(await screen.findByText("Good match")).toBeTruthy();
    const [request, installId] = vi.mocked(requestAssessment).mock.calls[0]!;
    expect(request.jobText).toBe(JOB_TEXT);
    expect(request.resumeText).toBe("Senior engineer, React.");
    expect(installId).toMatch(/^[0-9a-f-]{36}$/);

    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("Skills");
    expect(items[2]).toContain("This job does not state an education requirement.");
    expect(screen.getByText(result.tip!)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Overall match: 3 of 5" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Skills: 4 of 5" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: /Education/ })).toBeNull();
    expect(await loadCachedResult(page.tabId, page.url, page.text)).toEqual(result);
  });

  it("shows a saved result for the same tab without a new request", async () => {
    await saveCachedResult(page.tabId, { url: page.url, jobText: page.text, response: result });
    render(<App />);
    expect(await screen.findByText("Good match")).toBeTruthy();
    expect(requestAssessment).not.toHaveBeenCalled();
  });

  it("sends a new request when the user clicks Assess again", async () => {
    await saveCachedResult(page.tabId, { url: page.url, jobText: page.text, response: result });
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Assess again" }));
    expect(requestAssessment).toHaveBeenCalledOnce();
  });

  it("shows the not-a-job-posting message from the server", async () => {
    vi.mocked(requestAssessment).mockResolvedValue({
      ok: true,
      response: { kind: "not_job_posting", message: "We could not find a job posting on this page." },
    });
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Assess" }));
    expect(await screen.findByText("We could not find a job posting on this page.")).toBeTruthy();
  });

  it("shows an error message and lets the user try again", async () => {
    vi.mocked(requestAssessment).mockResolvedValueOnce({ ok: false, message: "Please wait one minute, then try again." });
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Assess" }));
    expect(await screen.findByText("Please wait one minute, then try again.")).toBeTruthy();
    expect(await loadCachedResult(page.tabId, page.url, page.text)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Good match")).toBeTruthy();
    expect(requestAssessment).toHaveBeenCalledTimes(2);
  });

  it("does not show the tip for a strong result", async () => {
    vi.mocked(requestAssessment).mockResolvedValue({
      ok: true,
      response: { ...result, overall: { label: "Strong match", steps: 4 }, tip: null },
    });
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Assess" }));
    expect(await screen.findByText("Strong match")).toBeTruthy();
    expect(screen.queryByText(/Add it, then assess the job again/)).toBeNull();
  });
});
