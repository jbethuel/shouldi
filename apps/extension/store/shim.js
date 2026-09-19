// Stands in for the Chrome extension APIs, so the real built popup and settings pages can render
// sample data for Chrome Web Store images. Loaded before the page's own scripts. Never shipped.
// Everything here is invented: the person, the companies, and the results.
(() => {
  const params = new URLSearchParams(location.search);
  const scene = params.get("scene") ?? "";

  const RESUME = `Alex Rivera
alex.rivera@example.com · +1 415 555 0142 · linkedin.com/in/alexrivera
Senior Frontend Engineer

Experience
Acme Payments — Senior Frontend Engineer, 2020 – 2026
- Led a team of 4 engineers building the merchant dashboard in React and TypeScript.
- Built a design system used by 6 product teams; cut page load time by 40%.
- Worked with design on checkout flows for small businesses.

BrightLedger — Frontend Engineer, 2017 – 2020
- Built reporting screens with React, Redux, and D3.
- Wrote end-to-end tests with Playwright.

Skills
TypeScript, React, Next.js, GraphQL, Playwright, accessibility (WCAG), design systems

Education
BS Computer Science`;

  const FRONTEND_JOB = `Senior Frontend Engineer
Fernway Payments · Remote (US)

About the role
Fernway builds payment tools for small businesses. You will own our merchant dashboard and help shape how thousands of shop owners get paid.

What you will do
- Build and own the merchant dashboard with React and TypeScript.
- Lead frontend architecture and mentor other engineers.
- Partner with design to improve checkout conversion.

Requirements
- 5+ years of frontend engineering experience.
- Expert knowledge of TypeScript and React.
- Experience with design systems and accessibility.
- GraphQL experience is a plus.`;

  const SELECTED = `Requirements
- 5+ years of frontend engineering experience.
- Expert knowledge of TypeScript and React.
- Experience with design systems and accessibility.
- GraphQL experience is a plus.`;

  const DESIGN_JOB = `Senior Product Designer
Fernway Payments · Remote (US)

What you will do
- Lead end-to-end design for the merchant dashboard.
- Run user research with small-business owners.
- Build and maintain our design system in Figma.

Requirements
- 6+ years of product design experience.
- A portfolio of shipped B2B products.
- Strong Figma and prototyping skills.`;

  const PAGES = {
    strong: { source: "page", title: "Senior Frontend Engineer | Fernway Careers", text: FRONTEND_JOB },
    preview: { source: "selection", title: "Senior Frontend Engineer | Fernway Careers", text: SELECTED },
    partial: { source: "page", title: "Senior Product Designer | Fernway Careers", text: DESIGN_JOB },
  };

  // Shaped exactly like real API responses; the words come from apps/api/lib/copy.ts.
  const RESULTS = {
    strong: {
      kind: "result",
      model: "jev-1.13.0",
      overall: { label: "Strong match", steps: 4 },
      criteria: [
        { id: "skills", name: "Skills", stated: true, steps: 5, sentence: "You have the skills that this job asks for." },
        { id: "tasks", name: "Tasks", stated: true, steps: 4, sentence: "You have done most of the main work of this job." },
        { id: "experience", name: "Experience level", stated: true, steps: 4, sentence: "Your experience is close to the level of this job." },
        { id: "industry", name: "Industry", stated: true, steps: 4, sentence: "You have worked in this industry." },
        { id: "education", name: "Education and certificates", stated: false, steps: null, sentence: "This job does not state an education requirement." },
      ],
      tip: null,
    },
    partial: {
      kind: "result",
      model: "jev-1.13.0",
      overall: { label: "Partial match", steps: 2 },
      criteria: [
        { id: "industry", name: "Industry", stated: true, steps: 4, sentence: "You have worked in this industry." },
        { id: "tasks", name: "Tasks", stated: true, steps: 3, sentence: "You have done some of the main work of this job." },
        { id: "experience", name: "Experience level", stated: true, steps: 3, sentence: "This job asks for a little more experience than your resume shows." },
        { id: "skills", name: "Skills", stated: true, steps: 2, sentence: "You have some of the skills that this job asks for." },
        { id: "education", name: "Education and certificates", stated: false, steps: null, sentence: "This job does not state an education requirement." },
      ],
      tip: "Do you have a skill or experience that is not in your resume? Add it, then assess the job again.",
    },
  };

  const page = PAGES[scene] && { ...PAGES[scene], url: `https://careers.fernway.example/jobs/${scene}` };
  const local = { resumeText: RESUME, removalName: "Alex Rivera", installId: "5d2f3c1a-8b7e-4f6d-9c0b-1a2e3d4c5b6a" };
  const session = {};
  if (page && RESULTS[scene]) session["result:1"] = { url: page.url, jobText: page.text, response: RESULTS[scene] };

  const area = (store) => ({
    async get(keys) {
      if (keys == null) return { ...store };
      const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
    },
    async set(items) {
      Object.assign(store, items);
    },
    async remove(keys) {
      for (const k of [].concat(keys)) delete store[k];
    },
    async clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
  });
  const event = () => ({ addListener() {}, removeListener() {}, hasListener: () => false });

  window.browser = {
    runtime: { id: "shouldi-store-images", openOptionsPage: async () => {}, onInstalled: event(), getURL: (p) => p },
    storage: { local: area(local), session: area(session), onChanged: event() },
    tabs: { query: async () => (page ? [{ id: 1, url: page.url }] : []) },
    scripting: { executeScript: async () => [{ result: page }] },
  };

  // Tell the scene page how tall the popup is, so its frame fits the content.
  const report = () => parent.postMessage({ shouldiHeight: document.documentElement.scrollHeight }, "*");
  new ResizeObserver(report).observe(document.documentElement);
  const timer = setInterval(report, 100);
  setTimeout(() => clearInterval(timer), 3000);

  // Settings scenes: open "Show the text that we send" and scroll to it.
  if (params.get("focus") === "preview") {
    setTimeout(() => {
      const details = document.querySelector("details");
      if (!details) return;
      details.open = true;
      const top = document.querySelector("#name")?.closest(".field")?.getBoundingClientRect().top ?? 0;
      window.scrollTo(0, window.scrollY + top - 24);
    }, 400);
  }
})();
