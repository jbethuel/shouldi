import type { AssessResponse } from "@shouldi/shared";
import { browser } from "wxt/browser";

// Everything here stays on this computer. `local` is on disk in the Chrome profile;
// `session` is memory only and Chrome clears it when the browser closes.

export interface Profile {
  resumeText: string;
  /** The user's name, found at the top of the resume when it is added, so it can be removed again before sending. */
  removalName: string;
}

const PROFILE_KEYS = ["resumeText", "removalName"] as const;
const INSTALL_ID_KEY = "installId";

export async function loadProfile(): Promise<Profile> {
  const stored = await browser.storage.local.get([...PROFILE_KEYS]);
  return {
    resumeText: typeof stored.resumeText === "string" ? stored.resumeText : "",
    removalName: typeof stored.removalName === "string" ? stored.removalName : "",
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await browser.storage.local.set({ resumeText: profile.resumeText, removalName: profile.removalName });
}

/** Random, anonymous ID used only for the daily limit. Created on first use. */
export async function getInstallId(): Promise<string> {
  const stored = await browser.storage.local.get(INSTALL_ID_KEY);
  if (typeof stored[INSTALL_ID_KEY] === "string") return stored[INSTALL_ID_KEY];
  const id = crypto.randomUUID();
  await browser.storage.local.set({ [INSTALL_ID_KEY]: id });
  return id;
}

/** Deletes the resume, the name, the install ID, and the results in memory. */
export async function deleteAllData(): Promise<void> {
  await Promise.all([browser.storage.local.clear(), browser.storage.session.clear()]);
}

export interface CachedResult {
  url: string;
  jobText: string;
  response: AssessResponse;
}

const resultKey = (tabId: number) => `result:${tabId}`;

export async function loadCachedResult(tabId: number, url: string, jobText: string): Promise<AssessResponse | null> {
  const key = resultKey(tabId);
  const cached = (await browser.storage.session.get(key))[key] as CachedResult | undefined;
  return cached && cached.url === url && cached.jobText === jobText ? cached.response : null;
}

export async function saveCachedResult(tabId: number, result: CachedResult): Promise<void> {
  await browser.storage.session.set({ [resultKey(tabId)]: result });
}

export async function removeCachedResult(tabId: number): Promise<void> {
  await browser.storage.session.remove(resultKey(tabId));
}
