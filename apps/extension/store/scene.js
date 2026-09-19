// Builds one 1280x800 Chrome Web Store screenshot around the real extension pages (served from the same folder).
const FRONTEND_JOB = (selected) => `
  <article class="job">
    <p class="company">Fernway Payments</p>
    <h2>Senior Frontend Engineer</h2>
    <p class="meta">Remote (US) · Full-time · Engineering</p>
    <h3>About the role</h3>
    <p>Fernway builds payment tools for small businesses. You will own our merchant dashboard and help shape how thousands of shop owners get paid.</p>
    <h3>What you will do</h3>
    <ul>
      <li>Build and own the merchant dashboard with React and TypeScript.</li>
      <li>Lead frontend architecture and mentor other engineers.</li>
      <li>Partner with design to improve checkout conversion.</li>
    </ul>
    <h3>${selected ? '<span class="selected">Requirements</span>' : "Requirements"}</h3>
    <ul>
      ${["5+ years of frontend engineering experience.", "Expert knowledge of TypeScript and React.", "Experience with design systems and accessibility.", "GraphQL experience is a plus."]
        .map((t) => `<li>${selected ? `<span class="selected">${t}</span>` : t}</li>`)
        .join("")}
    </ul>
    <span class="apply">Apply now</span>
  </article>`;

const DESIGN_JOB = `
  <article class="job">
    <p class="company">Fernway Payments</p>
    <h2>Senior Product Designer</h2>
    <p class="meta">Remote (US) · Full-time · Design</p>
    <h3>What you will do</h3>
    <ul>
      <li>Lead end-to-end design for the merchant dashboard.</li>
      <li>Run user research with small-business owners.</li>
      <li>Build and maintain our design system in Figma.</li>
    </ul>
    <h3>Requirements</h3>
    <ul>
      <li>6+ years of product design experience.</li>
      <li>A portfolio of shipped B2B products.</li>
      <li>Strong Figma and prototyping skills.</li>
    </ul>
    <span class="apply">Apply now</span>
  </article>`;

const SCENES = {
  "01-match": {
    headline: "See how your resume matches a job.",
    sub: "Open ShouldI on a job posting. You get a clear match level and one line for each part of the job.",
    url: "careers.fernway.example/jobs/senior-frontend-engineer",
    job: FRONTEND_JOB(false),
    popup: "strong",
  },
  "02-preview": {
    headline: "You choose what gets assessed.",
    sub: "ShouldI reads the page only when you click it. Select part of the page to assess just that text.",
    url: "careers.fernway.example/jobs/senior-frontend-engineer",
    job: FRONTEND_JOB(true),
    popup: "preview",
  },
  "03-encouraging": {
    headline: "Honest, encouraging results.",
    sub: "No percentages and no harsh words. See where you are strong and what to add next.",
    url: "careers.fernway.example/jobs/senior-product-designer",
    job: DESIGN_JOB,
    popup: "partial",
    scale: 1.0,
  },
  "04-privacy": {
    headline: "Your resume is saved only on your computer.",
    sub: "Upload a PDF or paste the text. ShouldI keeps it in Chrome. Our server does not store it.",
    url: "ShouldI settings",
    settings: "",
  },
  "05-sent": {
    headline: "See exactly what is sent.",
    sub: "Email addresses, phone numbers, links, and your name are removed before anything leaves your computer.",
    url: "ShouldI settings",
    settings: "&focus=preview",
  },
};

const scene = SCENES[new URLSearchParams(location.search).get("id")];
document.getElementById("headline").textContent = scene.headline;
document.getElementById("sub").textContent = scene.sub;
document.getElementById("url").textContent = scene.url;
const content = document.getElementById("content");

if (scene.settings !== undefined) {
  document.getElementById("toolbar").style.outline = "none";
  content.innerHTML = `<iframe class="settings-frame" src="options.html?scene=settings${scene.settings}"></iframe>`;
} else {
  content.innerHTML = `${scene.job}<div class="popup" style="--scale: ${scene.scale ?? 1.18}"><iframe src="popup.html?scene=${scene.popup}"></iframe></div>`;
  const frame = content.querySelector(".popup iframe");
  addEventListener("message", (event) => {
    if (typeof event.data?.shouldiHeight === "number") frame.style.height = `${event.data.shouldiHeight}px`;
  });
}
