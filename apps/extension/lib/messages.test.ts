import { describe, expect, it } from "vitest";
import { MESSAGES, RESUME_NOTICE } from "./messages";

describe("messages", () => {
  it("never use the words that the design review excluded", () => {
    const banned = /\b(fail|reject|unqualified|poor|weak|skip|not a fit)\b/i;
    expect(JSON.stringify([MESSAGES, RESUME_NOTICE])).not.toMatch(banned);
  });

  it("tell the user truthfully where the resume text goes", () => {
    expect(RESUME_NOTICE.staysBody).toContain("sends the resume text without your contact details to our server");
    expect(RESUME_NOTICE.staysBody).toContain("TypeSafe");
  });
});
