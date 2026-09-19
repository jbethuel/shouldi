import { beforeEach, describe, expect, it, vi } from "vitest";

// pdf.js itself is not under test; this checks how the text of each page is joined and tidied.
const destroy = vi.fn(async () => {});
const pages: { str?: string; hasEOL?: boolean }[][] = [];

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: async (n: number) => ({ getTextContent: async () => ({ items: pages[n - 1] }) }),
    }),
    destroy,
  })),
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "worker.js" }));

const { pdfToText } = await import("./pdf");
const { getDocument } = await import("pdfjs-dist");

beforeEach(() => {
  pages.length = 0;
  destroy.mockClear();
});

function file(): File {
  return new File([new Uint8Array([37, 80, 68, 70])], "resume.pdf", { type: "application/pdf" });
}

describe("pdfToText", () => {
  it("joins text items, keeps line ends, and separates pages", async () => {
    pages.push(
      [{ str: "Jane", hasEOL: false }, { str: " Doe", hasEOL: true }, { str: "Senior   Engineer", hasEOL: true }],
      [{ str: "Skills: React", hasEOL: true }],
    );
    expect(await pdfToText(file())).toBe("Jane Doe\nSenior Engineer\n\nSkills: React");
  });

  it("skips items without text, such as marked content", async () => {
    pages.push([{ str: "Engineer", hasEOL: true }, {}, { str: "React", hasEOL: false }]);
    expect(await pdfToText(file())).toBe("Engineer\nReact");
  });

  it("reads the bytes of the file on this computer and releases the document", async () => {
    pages.push([{ str: "Engineer", hasEOL: false }]);
    await pdfToText(file());
    expect(getDocument).toHaveBeenCalledWith({ data: new Uint8Array([37, 80, 68, 70]) });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("returns an empty string for a PDF with no text (for example a scanned image)", async () => {
    pages.push([], []);
    expect(await pdfToText(file())).toBe("");
  });
});
