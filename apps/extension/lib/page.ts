import { MAX_JOB_CHARS } from "@shouldi/shared";
import { browser } from "wxt/browser";

export interface PageText {
  source: "selection" | "page";
  title: string;
  text: string;
  url: string;
}

export interface JobPage extends PageText {
  tabId: number;
  /** True when the text was longer than the limit and only the first part is used. */
  cut: boolean;
}

/** Read the job text from the active tab. Returns null when Chrome does not allow it. */
export async function readActiveTab(): Promise<JobPage | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return null;
  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/extract.js"],
    });
    const page = injection?.result as PageText | undefined;
    if (!page) return null;
    const cut = page.text.length > MAX_JOB_CHARS;
    return { ...page, text: cut ? page.text.slice(0, MAX_JOB_CHARS) : page.text, tabId: tab.id, cut };
  } catch {
    // chrome:// pages, the Chrome Web Store, and similar pages do not allow scripts.
    return null;
  }
}
