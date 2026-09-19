import { Readability } from "@mozilla/readability";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import type { PageText } from "../lib/page";

// Runs in the current tab only after the user opens the popup (activeTab).
// It returns the text to the popup and sends nothing anywhere.

const MIN_SELECTION_CHARS = 20;

export default defineUnlistedScript((): PageText => {
  const selection = window.getSelection()?.toString().trim() ?? "";
  if (selection.length >= MIN_SELECTION_CHARS) {
    return { source: "selection", title: document.title, text: tidy(selection), url: location.href };
  }
  const article = new Readability(document.cloneNode(true) as Document).parse();
  const text = article?.textContent || document.body?.innerText || "";
  return { source: "page", title: article?.title || document.title, text: tidy(text), url: location.href };
});

function tidy(text: string): string {
  return text
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
