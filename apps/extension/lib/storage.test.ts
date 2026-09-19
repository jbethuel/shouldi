import type { AssessResponse } from "@shouldi/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  deleteAllData,
  getInstallId,
  loadCachedResult,
  loadProfile,
  removeCachedResult,
  saveCachedResult,
  saveProfile,
} from "./storage";

const response: AssessResponse = { kind: "not_job_posting", message: "No job here." };

beforeEach(() => {
  fakeBrowser.reset();
});

describe("profile", () => {
  it("returns empty values before anything is saved", async () => {
    expect(await loadProfile()).toEqual({ resumeText: "", removalName: "" });
  });

  it("saves the profile in local storage only", async () => {
    await saveProfile({ resumeText: "Engineer", removalName: "Jane Doe" });
    expect(await loadProfile()).toEqual({ resumeText: "Engineer", removalName: "Jane Doe" });
    expect(await fakeBrowser.storage.local.get(null)).toEqual({ resumeText: "Engineer", removalName: "Jane Doe" });
    expect(await fakeBrowser.storage.session.get(null)).toEqual({});
  });

  it("ignores stored values that are not strings", async () => {
    await fakeBrowser.storage.local.set({ resumeText: 42, removalName: null });
    expect(await loadProfile()).toEqual({ resumeText: "", removalName: "" });
  });
});

describe("getInstallId", () => {
  it("creates a random UUID once and then reuses it", async () => {
    const first = await getInstallId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getInstallId()).toBe(first);
  });
});

describe("cached results", () => {
  it("returns a result only for the same tab, URL, and job text", async () => {
    await saveCachedResult(7, { url: "https://jobs.example/1", jobText: "Job text", response });
    expect(await loadCachedResult(7, "https://jobs.example/1", "Job text")).toEqual(response);
    expect(await loadCachedResult(8, "https://jobs.example/1", "Job text")).toBeNull();
    expect(await loadCachedResult(7, "https://jobs.example/2", "Job text")).toBeNull();
    expect(await loadCachedResult(7, "https://jobs.example/1", "Other selection")).toBeNull();
  });

  it("keeps results in session storage, not on disk", async () => {
    await saveCachedResult(7, { url: "u", jobText: "t", response });
    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
    expect(Object.keys(await fakeBrowser.storage.session.get(null))).toEqual(["result:7"]);
  });

  it("removes a result", async () => {
    await saveCachedResult(7, { url: "u", jobText: "t", response });
    await removeCachedResult(7);
    expect(await loadCachedResult(7, "u", "t")).toBeNull();
  });
});

describe("deleteAllData", () => {
  it("deletes the resume, the name, the install ID, and the results in memory", async () => {
    await saveProfile({ resumeText: "Engineer", removalName: "Jane" });
    const id = await getInstallId();
    await saveCachedResult(7, { url: "u", jobText: "t", response });

    await deleteAllData();

    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
    expect(await fakeBrowser.storage.session.get(null)).toEqual({});
    expect(await getInstallId()).not.toBe(id);
  });
});
