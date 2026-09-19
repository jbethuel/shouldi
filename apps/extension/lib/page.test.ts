import { MAX_JOB_CHARS } from "@shouldi/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { type PageText, readActiveTab } from "./page";

const page: PageText = { source: "page", title: "Engineer", text: "A job posting.", url: "https://jobs.example/1" };

function activeTab(id: number | undefined) {
  vi.spyOn(fakeBrowser.tabs, "query").mockResolvedValue((id === undefined ? [] : [{ id }]) as never);
}

function injection(result: unknown) {
  return vi.spyOn(fakeBrowser.scripting, "executeScript").mockResolvedValue([{ result }] as never);
}

beforeEach(() => {
  fakeBrowser.reset();
});

describe("readActiveTab", () => {
  it("runs the text reader in the active tab and returns its text", async () => {
    activeTab(3);
    const execute = injection(page);
    expect(await readActiveTab()).toEqual({ ...page, tabId: 3, cut: false });
    expect(execute).toHaveBeenCalledWith({ target: { tabId: 3 }, files: ["/extract.js"] });
  });

  it("cuts long job text and says that it did", async () => {
    activeTab(3);
    injection({ ...page, text: "x".repeat(MAX_JOB_CHARS + 50) });
    const result = await readActiveTab();
    expect(result?.cut).toBe(true);
    expect(result?.text).toHaveLength(MAX_JOB_CHARS);
  });

  it("returns null when there is no active tab", async () => {
    activeTab(undefined);
    expect(await readActiveTab()).toBeNull();
  });

  it("returns null when Chrome does not allow scripts on the page", async () => {
    activeTab(3);
    vi.spyOn(fakeBrowser.scripting, "executeScript").mockRejectedValue(new Error("Cannot access a chrome:// URL"));
    expect(await readActiveTab()).toBeNull();
  });

  it("returns null when the script gives no result", async () => {
    activeTab(3);
    injection(undefined);
    expect(await readActiveTab()).toBeNull();
  });
});
