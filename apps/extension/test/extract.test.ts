// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { PageText } from "../lib/page";
import extract from "../entrypoints/extract";

const JOB_HTML = `
  <header><nav><a href="/">Home</a> <a href="/jobs">All jobs</a> <a href="/login">Sign in</a></nav></header>
  <main>
    <article>
      <h1>Senior Frontend Engineer</h1>
      <p>We are a fintech company that builds payment tools for small businesses. You will build and own our
      merchant dashboard with React and TypeScript, lead frontend architecture, and mentor other engineers.</p>
      <p>You will partner with design to improve checkout conversion, and you will work closely with product
      managers to plan quarterly goals for the dashboard and the checkout experience.</p>
      <h2>Requirements</h2>
      <p>Five or more years of frontend engineering experience. Expert knowledge of TypeScript and React.
      Experience with design systems and accessibility. Experience with GraphQL is a plus.</p>
      <p>We offer remote work, a learning budget, and health insurance. Apply with your resume today.</p>
    </article>
  </main>
  <footer>© Example Inc. Privacy. Terms. Cookie settings.</footer>`;

function run(): PageText {
  return extract.main() as PageText;
}

beforeEach(() => {
  document.title = "Senior Frontend Engineer | Example Jobs";
  document.body.innerHTML = JOB_HTML;
  window.getSelection()?.removeAllRanges();
});

describe("extract script", () => {
  it("reads the main job text and leaves out the navigation and footer", () => {
    const page = run();
    expect(page.source).toBe("page");
    expect(page.url).toBe(location.href);
    expect(page.text).toContain("merchant dashboard with React and TypeScript");
    expect(page.text).toContain("Experience with GraphQL is a plus.");
    expect(page.text).not.toContain("Sign in");
    expect(page.text).not.toContain("Cookie settings");
  });

  it("uses only the selected text when the user selected enough text", () => {
    const paragraph = document.querySelectorAll("article p")[2]!;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()!.addRange(range);

    const page = run();
    expect(page.source).toBe("selection");
    expect(page.title).toBe("Senior Frontend Engineer | Example Jobs");
    expect(page.text).toBe(
      "Five or more years of frontend engineering experience. Expert knowledge of TypeScript and React.\nExperience with design systems and accessibility. Experience with GraphQL is a plus.",
    );
  });

  it("ignores a very short selection, which is probably a mistake", () => {
    const heading = document.querySelector("h1")!;
    const range = document.createRange();
    range.setStart(heading.firstChild!, 0);
    range.setEnd(heading.firstChild!, 6);
    window.getSelection()!.addRange(range);

    expect(run().source).toBe("page");
  });

  it("tidies spaces and blank lines", () => {
    document.body.innerHTML = `<article><p>${"Role:  Engineer.   Duties  include    code.\n\n\n\n".repeat(20)}</p></article>`;
    const text = run().text;
    expect(text).not.toMatch(/ {2}| |\n{3}/);
    expect(text.startsWith("Role: Engineer. Duties include code.")).toBe(true);
  });

  it("does not modify the page", () => {
    const before = document.body.innerHTML;
    run();
    expect(document.body.innerHTML).toBe(before);
  });

  it("returns empty text for a page with no readable content", () => {
    document.body.innerHTML = "";
    expect(run()).toMatchObject({ source: "page", text: "" });
  });
});
