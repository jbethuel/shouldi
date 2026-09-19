import { describe, expect, it } from "vitest";
import { findName, redact } from "./redact";

describe("redact", () => {
  it("removes email addresses with their label", () => {
    expect(redact("Email: jane.doe+jobs@example.co.uk\nEngineer", "")).toBe("Engineer");
    expect(redact("Write to jane@example.com today.", "")).toBe("Write to today.");
  });

  it("removes links with and without a scheme", () => {
    const text = "https://janedoe.dev/portfolio | www.example.com | linkedin.com/in/jane-doe | github.com/janedoe\nEngineer";
    expect(redact(text, "")).toBe("Engineer");
  });

  it("keeps technology names that look like domains", () => {
    const text = "Skills: Node.js, ASP.NET, Vue.js, Next.js, .NET Core";
    expect(redact(text, "")).toBe(text);
  });

  it("removes phone numbers in common formats", () => {
    for (const phone of ["+1 (415) 555-0132", "415.555.0132", "+63 917 123 4567", "09171234567"]) {
      expect(redact(`Engineer\nPhone: ${phone}`, "")).toBe("Engineer");
    }
  });

  it("keeps year ranges and short numbers", () => {
    const text = "Engineer, 2019 - 2021. Led a team of 12. Cut costs by 35%. 2015-2019";
    expect(redact(text, "")).toBe(text);
  });

  it("removes the separators and brackets around removed details", () => {
    expect(redact("Senior Engineer · jane@example.com · 415-555-0132 · jane.dev", "")).toBe("Senior Engineer");
    expect(redact("San Francisco, CA | jane@example.com", "")).toBe("San Francisco, CA");
    expect(redact("Find me (https://jane.dev) or <jane@example.com>.", "")).toBe("Find me or.");
  });

  it("removes lines that held only contact details, and keeps one blank line where they were", () => {
    const text = "Jane Doe\njane@example.com | 415-555-0132\n\nSummary\nBuilt things.\n\n- linkedin.com/in/jane\n\nExperience";
    expect(redact(text, "Jane Doe")).toBe("Summary\nBuilt things.\n\nExperience");
  });

  it("keeps text without contact details exactly as it is", () => {
    const text = "Summary  \n\n\n  Built things, 2019 - 2021.\n";
    expect(redact(text, "Jane Doe")).toBe(text);
  });

  it("changes nothing when it runs again", () => {
    const once = redact("Jane Doe\njane@example.com\nAcme Payments\nJane led the team.", "Jane Doe");
    expect(once).toBe("Acme Payments\nled the team.");
    expect(redact(once, "Jane Doe")).toBe(once);
  });
});

describe("redact the name", () => {
  it("removes the name in any letter case and the name parts as written in a name", () => {
    const text = "JANE MARIE DOE\nJane Doe led the Doe Labs project. Jane mentored interns.";
    expect(redact(text, "Jane Marie Doe")).toBe("led the Labs project. mentored interns.");
  });

  it("keeps ordinary words that match a lowercase name part", () => {
    expect(redact("Will Grant\nI will grant access.", "Will Grant")).toBe("I will grant access.");
  });

  it("handles names with hyphens, apostrophes, and characters that regular expressions treat as special", () => {
    const text = "Jean-Luc O'Brien\nJEAN-LUC O'BRIEN wrote C++ code. Luc stayed.";
    expect(redact(text, "Jean-Luc O'Brien")).toBe("wrote C++ code. Luc stayed.");
  });

  it("removes the whole name with particles, but keeps particles elsewhere", () => {
    expect(redact("Juan de la Cruz\nCruz built a CRM de novo.", "Juan de la Cruz")).toBe("built a CRM de novo.");
  });

  it("removes a possessive name with its 's", () => {
    expect(redact("Jane Doe\nDoe's team shipped.", "Jane Doe")).toBe("team shipped.");
  });

  it("keeps initials in other text", () => {
    expect(redact("Jane Q. Doe\nUsed Q and R.", "Jane Q. Doe")).toBe("Used Q and R.");
  });

  it("removes a name that was typed in lowercase in earlier versions", () => {
    expect(redact("jane doe\nEngineer", "jane doe")).toBe("Engineer");
  });

  it("does nothing more with an empty name", () => {
    expect(redact("Jane Doe\nEngineer", "  ")).toBe("Jane Doe\nEngineer");
  });
});

describe("findName", () => {
  it("finds the name on the first line", () => {
    expect(findName("Jane Doe\nEngineer")).toBe("Jane Doe");
    expect(findName("JANE MARIE DOE")).toBe("JANE MARIE DOE");
    expect(findName("Jean-Luc O'Brien")).toBe("Jean-Luc O'Brien");
    expect(findName("Juan de la Cruz")).toBe("Juan de la Cruz");
  });

  it("finds the name before a job title or contact details on the same line", () => {
    expect(findName("Jane Doe | Senior Engineer")).toBe("Jane Doe");
    expect(findName("Jane Doe · jane@example.com")).toBe("Jane Doe");
    expect(findName("Jane Doe - Engineer")).toBe("Jane Doe");
    expect(findName("Jane Doe, PhD")).toBe("Jane Doe");
  });

  it("finds the name after a Resume heading and blank lines", () => {
    expect(findName("\n  RESUME\n\nJane Doe\nEngineer")).toBe("Jane Doe");
    expect(findName("Curriculum Vitae\nJane Doe")).toBe("Jane Doe");
  });

  it("finds nothing when the first line is not a name", () => {
    for (const text of [
      "",
      "Senior Software Engineer\nJane Doe",
      "Professional Summary",
      "Engineer with 8 years of experience in payments",
      "Engineer",
      "jane doe",
      "jane@example.com | 415-555-0132",
      "Built React Apps For Many Clients",
    ]) {
      expect(findName(text)).toBe("");
    }
  });
});
