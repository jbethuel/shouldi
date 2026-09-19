// @vitest-environment jsdom
import { MAX_RESUME_CHARS } from "@shouldi/shared";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { RESUME_NOTICE } from "../../lib/messages";
import { pdfToText } from "../../lib/pdf";
import { getInstallId, loadProfile, saveProfile } from "../../lib/storage";
import { App } from "./App";

vi.mock("../../lib/pdf", () => ({ pdfToText: vi.fn() }));

const resumeBox = () => screen.getByLabelText("Your resume") as HTMLTextAreaElement;
const nameBox = () => screen.getByLabelText("Your name") as HTMLInputElement;
const saveButton = () => screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;

async function renderLoaded() {
  render(<App />);
  // Wait for the stored profile to load into the form.
  await waitFor(async () => expect(resumeBox().value).toBe((await loadProfile()).resumeText));
}

beforeEach(() => {
  fakeBrowser.reset();
});

afterEach(() => {
  cleanup();
});

describe("settings page", () => {
  it("shows the privacy notice", async () => {
    await renderLoaded();
    expect(screen.getByText(RESUME_NOTICE.removeTitle)).toBeTruthy();
    expect(screen.getByText(RESUME_NOTICE.staysTitle)).toBeTruthy();
  });

  it("loads the saved resume and name", async () => {
    await saveProfile({ resumeText: "Senior engineer", removalName: "Jane Doe" });
    await renderLoaded();
    expect(resumeBox().value).toBe("Senior engineer");
    expect(nameBox().value).toBe("Jane Doe");
    expect(saveButton().disabled).toBe(true);
  });

  it("saves trimmed text on this computer after a change", async () => {
    await renderLoaded();
    await userEvent.type(resumeBox(), "  Senior engineer  ");
    await userEvent.type(nameBox(), " Jane Doe ");
    await userEvent.click(saveButton());

    expect(await screen.findByText("Saved on this computer.")).toBeTruthy();
    expect(await loadProfile()).toEqual({ resumeText: "Senior engineer", removalName: "Jane Doe" });
    expect(saveButton().disabled).toBe(true);
  });

  it("previews the exact text that is sent, without contact details", async () => {
    await saveProfile({ resumeText: "Jane Doe\njane@example.com\nSenior engineer", removalName: "Jane Doe" });
    await renderLoaded();
    await userEvent.click(screen.getByText("Show the text that we send"));
    expect(screen.getByText(/\[removed\]\s+\[removed\]\s+Senior engineer/)).toBeTruthy();
    expect(screen.queryByText(/jane@example\.com/, { selector: "pre" })).toBeNull();
  });

  it("counts characters and says when only the first part is used", async () => {
    await saveProfile({ resumeText: "x".repeat(MAX_RESUME_CHARS + 1), removalName: "" });
    await renderLoaded();
    expect(screen.getByText(/only the first part is used/)).toBeTruthy();
  });

  it("puts the text of a PDF into the resume box", async () => {
    vi.mocked(pdfToText).mockResolvedValue("Text from the PDF");
    await renderLoaded();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["%PDF"], "resume.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(resumeBox().value).toBe("Text from the PDF"));
    expect(saveButton().disabled).toBe(false);
  });

  it("asks the user to paste the text when a PDF has no readable text", async () => {
    vi.mocked(pdfToText).mockResolvedValue("");
    await renderLoaded();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["%PDF"], "scan.pdf", { type: "application/pdf" }));
    expect(await screen.findByText(/We could not read text from this PDF/)).toBeTruthy();
  });

  it("deletes all data only after a second confirmation", async () => {
    await saveProfile({ resumeText: "Senior engineer", removalName: "Jane Doe" });
    await getInstallId();
    await renderLoaded();

    await userEvent.click(screen.getByRole("button", { name: "Delete all my data" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect((await loadProfile()).resumeText).toBe("Senior engineer");

    await userEvent.click(screen.getByRole("button", { name: "Delete all my data" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Your data is deleted.")).toBeTruthy();
    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
    expect(resumeBox().value).toBe("");
    expect(nameBox().value).toBe("");
  });

  it("links to the privacy policy on the API site", async () => {
    await renderLoaded();
    expect(screen.getByRole("link", { name: "Privacy policy" }).getAttribute("href")).toBe(
      "https://shouldiapply.vercel.app/privacy",
    );
  });
});
