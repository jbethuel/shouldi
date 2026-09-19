const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const URL_WITH_SCHEME = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;

// Bare domains such as linkedin.com/in/jane or jane.dev. Lowercase only, so skill names
// like "ASP.NET" stay; ".js" is not in the list, so "Node.js" stays.
const BARE_DOMAIN =
  /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|me|co|ai|app|page|site|tech|xyz|info|link)\b(?:\/[^\s<>()]*)?/g;

// Candidates for phone numbers. A match counts only with 9 to 15 digits, so year
// ranges such as "2019 - 2021" (8 digits) stay.
const PHONE_CANDIDATE = /\+?\(?\d[\d\s().-]{7,}\d/g;

// Headings that some resumes put above the name.
const HEADINGS = new Set(["resume", "résumé", "cv", "curriculum vitae"]);

// Words that show that the first line is a job title or a section heading, not a name.
const NOT_NAME = new Set([
  "senior", "junior", "lead", "principal", "staff", "chief", "head", "engineer", "developer", "designer",
  "manager", "analyst", "consultant", "director", "architect", "specialist", "scientist", "intern", "officer",
  "assistant", "coordinator", "software", "frontend", "backend", "stack", "data", "product", "project",
  "marketing", "sales", "experience", "education", "skills", "summary", "profile", "contact", "objective",
]);

// Lowercase words inside names, such as "de la Cruz" or "van der Berg". Alone they stay in the text,
// because removing every "de" or "la" would change ordinary words.
const PARTICLES = new Set([
  "de", "del", "dela", "la", "le", "da", "das", "dos", "di", "du", "van", "von", "der", "den", "bin", "al", "el",
]);

const NAME_WORD = /^\p{Lu}[\p{L}'’.-]*$/u;

// Stands in for removed text while the lines are cleaned up. U+FFFF is not a character, so no resume has it.
const MARK = "\uFFFF";

// Separators between items on a contact line: "Jane Doe | jane@example.com · 415-555-0132".
const SEP = "(?:[|·•,;/–—]|-(?=\\s))";

/**
 * Find the user's name. On almost every resume it is the first line, sometimes after a
 * "Resume" heading and before a job title or contact details on the same line.
 * Returns "" when that line does not look like a name. Use it only on text as the user added it:
 * after `redact`, the first line is a different line.
 */
export function findName(text: string): string {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const line = HEADINGS.has(lines[0]?.toLowerCase() ?? "") ? lines[1] : lines[0];
  if (!line) return "";

  // "Jane Doe | Engineer", "Jane Doe · jane@example.com", "Jane Doe, PhD"
  const [candidate = ""] = line.split(/\s*(?:[|·•,–—]|\s-\s)\s*/);
  const words = candidate.split(/\s+/);
  if (words.length < 2 || words.length > 4) return "";
  if (!NAME_WORD.test(words[0] ?? "")) return "";
  if (!words.every((word) => NAME_WORD.test(word) || PARTICLES.has(word))) return "";
  if (words.some((word) => NOT_NAME.has(word.toLowerCase()))) return "";
  return candidate;
}

/**
 * Delete email addresses, links, phone numbers, and the given name from resume text, with the
 * labels and separators around them. Lines that held only these details go away. Lines without
 * them stay exactly as they were. The text never leaves the computer before this runs.
 */
export function redact(text: string, name: string): string {
  let marked = text
    .replace(EMAIL, MARK)
    .replace(URL_WITH_SCHEME, MARK)
    .replace(BARE_DOMAIN, MARK)
    .replace(PHONE_CANDIDATE, (match) => {
      const digits = match.replace(/\D/g, "").length;
      return digits >= 9 && digits <= 15 ? MARK : match;
    });

  // The whole name first, then each part only as written in a name ("Jane" or "JANE"), so
  // ordinary words such as "will" or "grant" stay. Initials such as "Q." stay too.
  const whole = name.trim().replace(/\s+/g, " ");
  const parts = whole.split(" ").filter((part) => part.replace(/\.$/, "").length >= 2 && !PARTICLES.has(part));
  const forms = [whole, whole.toUpperCase(), ...parts.flatMap((part) => [part, capitalize(part), part.toUpperCase()])];
  for (const form of new Set(forms.filter(Boolean))) {
    marked = marked.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(form)}(?![\\p{L}\\p{N}])`, "gu"), MARK);
  }

  return marked.includes(MARK) ? removeMarked(marked) : text;
}

function removeMarked(text: string): string {
  const kept: string[] = [];
  let dropped = false;
  for (const line of text.split("\n")) {
    if (!line.includes(MARK)) {
      // Where a line went away, keep only one blank line, and none at the top.
      if (dropped && !line.trim() && !(kept.at(-1)?.trim() ?? "")) continue;
      kept.push(line);
      dropped = false;
      continue;
    }
    const cleaned = cleanLine(line);
    dropped = !/[\p{L}\p{N}]/u.test(cleaned);
    if (!dropped) kept.push(cleaned);
  }
  return kept.join("\n");
}

function cleanLine(line: string): string {
  return (
    line
      // "Email: jane@example.com" and "Doe's": the label and the "'s" go too.
      .replace(new RegExp(`(?:\\p{L}+ )?\\p{L}+:\\s*${MARK}`, "gu"), MARK)
      .replace(new RegExp(`${MARK}['’]s\\b`, "g"), MARK)
      // "(jane.dev)", "<jane@example.com>"
      .replace(new RegExp(`[(\\[<{]\\s*${MARK}\\s*[)\\]>}]`, "g"), MARK)
      // Removed items next to each other become one: "jane@example.com · 415-555-0132"
      .replace(new RegExp(`${MARK}(?:(?:\\s|${SEP})*${MARK})+`, "g"), MARK)
      // The separator next to a removed item: "Engineer · jane@example.com", "Jane Doe | Engineer"
      .replace(new RegExp(`\\s*${SEP}\\s*${MARK}|${MARK}\\s*${SEP}\\s*`, "g"), MARK)
      .replaceAll(MARK, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ +([.,;:!?])/g, "$1")
      .trim()
  );
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
