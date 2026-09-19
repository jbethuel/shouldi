export const REMOVED = "[removed]";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const URL_WITH_SCHEME = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;

// Bare domains such as linkedin.com/in/jane or jane.dev. Lowercase only, so skill names
// like "ASP.NET" stay; ".js" is not in the list, so "Node.js" stays.
const BARE_DOMAIN =
  /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|me|co|ai|app|page|site|tech|xyz|info|link)\b(?:\/[^\s<>()]*)?/g;

// Candidates for phone numbers. A match counts only with 9 to 15 digits, so year
// ranges such as "2019 - 2021" (8 digits) stay.
const PHONE_CANDIDATE = /\+?\(?\d[\d\s().-]{7,}\d/g;

/**
 * Remove email addresses, links, phone numbers, and the user's name from resume text.
 * The text never leaves the computer before this runs.
 */
export function redact(text: string, name: string): string {
  let result = text
    .replace(EMAIL, REMOVED)
    .replace(URL_WITH_SCHEME, REMOVED)
    .replace(BARE_DOMAIN, REMOVED)
    .replace(PHONE_CANDIDATE, (match) => {
      const digits = match.replace(/\D/g, "").length;
      return digits >= 9 && digits <= 15 ? keepEdges(match, REMOVED) : match;
    });

  // Each name part only as written in a name ("Jane" or "JANE"), so ordinary words
  // such as "will" or "grant" stay.
  const parts = name.trim().split(/\s+/).filter((part) => part.length >= 2);
  for (const part of parts) {
    for (const form of new Set([part, capitalize(part), part.toUpperCase()])) {
      result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(form)}(?![\\p{L}\\p{N}])`, "gu"), REMOVED);
    }
  }

  // "[removed] [removed]" on one line becomes one "[removed]".
  return result.replace(/\[removed\](?:[ \t]+\[removed\])+/g, REMOVED);
}

/** Keep leading and trailing spaces of the match so that the words around it stay apart. */
function keepEdges(match: string, replacement: string): string {
  const lead = match.match(/^\s*/)?.[0] ?? "";
  const trail = match.match(/\s*$/)?.[0] ?? "";
  return `${lead}${replacement}${trail}`;
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
