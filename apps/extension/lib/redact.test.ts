import { describe, expect, it } from "vitest";
import { REMOVED, redact } from "./redact";

describe("redact", () => {
  it("removes email addresses", () => {
    expect(redact("Contact: jane.doe+jobs@example.co.uk today", "")).toBe(`Contact: ${REMOVED} today`);
  });

  it("removes links with and without a scheme", () => {
    const text = "https://janedoe.dev/portfolio | www.example.com | linkedin.com/in/jane-doe | github.com/janedoe";
    expect(redact(text, "")).toBe([REMOVED, REMOVED, REMOVED, REMOVED].join(" | "));
  });

  it("keeps technology names that look like domains", () => {
    const text = "Skills: Node.js, ASP.NET, Vue.js, Next.js, .NET Core";
    expect(redact(text, "")).toBe(text);
  });

  it("removes phone numbers in common formats", () => {
    for (const phone of ["+1 (415) 555-0132", "415.555.0132", "+63 917 123 4567", "09171234567"]) {
      expect(redact(`Phone: ${phone}`, "")).toBe(`Phone: ${REMOVED}`);
    }
  });

  it("keeps year ranges and short numbers", () => {
    const text = "Engineer, 2019 - 2021. Led a team of 12. Cut costs by 35%. 2015-2019";
    expect(redact(text, "")).toBe(text);
  });

  it("removes the full name in any letter case and the name parts as written in a name", () => {
    const text = "JANE MARIE DOE\nJane Doe led the Doe Labs project. Jane mentored interns.";
    expect(redact(text, "Jane Marie Doe")).toBe(
      `${REMOVED}\n${REMOVED} led the ${REMOVED} Labs project. ${REMOVED} mentored interns.`,
    );
  });

  it("keeps ordinary words that match a lowercase name part", () => {
    expect(redact("Will Grant: I will grant access.", "Will Grant")).toBe(`${REMOVED}: I will grant access.`);
  });

  it("does nothing with an empty name", () => {
    expect(redact("Senior engineer", "   ")).toBe("Senior engineer");
  });

  it("removes contact details inside brackets and punctuation", () => {
    expect(redact("<jane@example.com>, (https://jane.dev), [+1 415 555 0132].", "")).toBe(
      `<${REMOVED}>, (${REMOVED}), [${REMOVED}].`,
    );
  });

  it("handles names with hyphens, apostrophes, and characters that regular expressions treat as special", () => {
    const text = "Jean-Luc O'Brien (JEAN-LUC O'BRIEN) wrote C++ code. Luc stayed.";
    expect(redact(text, "Jean-Luc O'Brien")).toBe(`${REMOVED} (${REMOVED}) wrote C++ code. Luc stayed.`);
  });

  it("removes a name that the user typed in lowercase wherever it appears in lowercase", () => {
    expect(redact("jane doe, Jane Doe", "jane doe")).toBe(`${REMOVED}, ${REMOVED}`);
  });

  it("ignores single-letter name parts such as initials", () => {
    expect(redact("Jane Q. Doe used Q and R.", "Jane Q Doe")).toBe(`${REMOVED} Q. ${REMOVED} used Q and R.`);
  });

  it("keeps the line structure of the resume", () => {
    const text = "JANE DOE\njane@example.com | 415-555-0132\n\nExperience\nEngineer, 2019 - 2021";
    expect(redact(text, "Jane Doe")).toBe(`${REMOVED}\n${REMOVED} | ${REMOVED}\n\nExperience\nEngineer, 2019 - 2021`);
  });
});

