# Should I Apply? — Plan

Should I Apply? is a public Chrome extension (first named "ShouldI"; renamed because the capital I reads as a lowercase l). It shows how well the user's resume matches the job posting on the current page. The user's decisions below come from a design review that was written in ASD-STE100 Simplified Technical English.

Subtitle in the Chrome Web Store: **"See how your resume matches a job."**

## 1. User flow

1. The user adds a resume in the settings page (PDF or pasted text). The user can correct the text before saving.
2. On a job page, the user clicks the extension icon. The popup opens.
3. The popup reads the job text from the current tab and shows it. If the user selected text on the page, the popup uses only the selected text.
4. The user clicks **Assess**.
5. The popup shows the result.

## 2. Privacy rules

- The resume is saved only in `chrome.storage.local`.
- Before sending, the extension removes email addresses, phone numbers, links, and the name that the user enters in the settings. The resume screen tells the user to remove other personal details.
- The extension sends data only when the user clicks **Assess**. It never sends data automatically.
- The server does not save resume text or job text and does not write it to logs.
- No history is saved. The last result for each tab stays in `chrome.storage.session` (memory only).
- No analytics in the extension.
- Permissions: `activeTab`, `scripting`, `storage`. No host permissions. The API allows the extension through CORS.

### Resume screen text

> **Remove your personal details before you save.** Remove your address and all other details that can identify you. The extension automatically removes email addresses, phone numbers, links, and the name in your settings.
>
> **Your resume stays on this computer.** When you assess a job, the extension sends the resume text without your contact details to our server. Our server sends it to TypeSafe for the assessment. Our server does not keep it. TypeSafe does not use it to train AI models.

### Settings controls

- Edit the resume text.
- Change the name used for removal.
- **Delete all my data** — deletes the resume, the name, and the install ID from this computer.

## 3. Text limits

- The extension uses Mozilla Readability to find the main text of the page. Selected text takes priority.
- Maximum job text: 20,000 characters. Maximum resume text: 15,000 characters.
- If the job text is cut, the popup shows: "We used the first part of the job text."
- The server rejects a request body that is larger than 64 KB.

## 4. Assessment (Jev)

One Jev request, model `jev-latest`. The server logs the model name from each response (never text).

State: `{ "job": { "text": "..." }, "resume": { "text": "..." } }`

Questions (all in parallel):

| ID | Type | Purpose |
|---|---|---|
| `is_job_posting` | Noul | Is `job.text` a job posting for one role? If probability < 0.5, show the "not a job posting" message and no levels. |
| `skills` | Score 0–4 | Skills that the job asks for vs. skills in the resume |
| `tasks` | Score 0–4 | Main tasks of the job vs. tasks in the resume |
| `experience` | Score 0–4 | Seniority / years that the job asks for vs. years of relevant experience in the resume (unrelated work does not count) |
| `industry` | Score 0–4 | Industry of the job vs. industries in the resume |
| `education` | Score 0–4 | Degrees, licenses, certificates that the job asks for vs. the resume |
| `experience_stated` | Noul | Does the job state an experience level? |
| `industry_stated` | Noul | Does the job state an industry? |
| `education_stated` | Noul | Does the job state an education requirement? |

### Level descriptions

| Level | Skills | Tasks | Experience level | Industry | Education and certificates |
|---|---|---|---|---|---|
| 4 | All or almost all of the skills | All the main tasks, at the same size or larger | Same level or higher | Many years in the same industry, with the same type of product or customer | All the items that the job asks for |
| 3 | Most skills; one or two are not shown | Most of the main tasks | Almost the same level, with a small gap | One or more full jobs in the same industry | Most items |
| 2 | Approximately half of the skills | Some of the main tasks | One level lower, or 1–2 years less | A short job or part of a job in the same industry | Some items, or an equivalent that the job accepts |
| 1 | A few of the skills | Related work, but not the same tasks | One level lower and 3 or more years less | A related industry only | Related education only |
| 0 | None of the skills | No similar work | Two or more levels lower | No work in the same or a related industry | None of the items |

### Weights and composition

- Weights: Skills 30%, Tasks 25%, Experience level 20%, Industry 15%, Education and certificates 10%.
- If a `*_stated` Noul is < 0.5, that criterion shows "This job does not say," and its weight is shared among the other criteria in proportion to their weights.
- Total = Σ (weight × score / 4), from 0 to 1.

### Labels

| Total | Label |
|---|---|
| 0.85 or more | Excellent match |
| 0.70 to 0.84 | Strong match |
| 0.50 to 0.69 | Good match |
| 0.30 to 0.49 | Partial match |
| Less than 0.30 | Early match |

Display: label + 5-step bar (no percentage). Then each criterion with a 5-step bar and one sentence, strongest first. Then the tip, for "Good match" or lower.

The server returns the final words, so they can change without a new extension release.

### Criterion sentences

**Skills**
- 4: You have the skills that this job asks for.
- 3: You have most of the skills that this job asks for.
- 2: You have about half of the skills that this job asks for.
- 1: You have some of the skills that this job asks for.
- 0: This job uses skills that your resume does not show yet.

**Tasks**
- 4: You have done the main work of this job.
- 3: You have done most of the main work of this job.
- 2: You have done some of the main work of this job.
- 1: Your past work is related to this job.
- 0: The work in this job is different from your past work.

**Experience level**
- 4: Your experience matches the level of this job.
- 3: Your experience is close to the level of this job.
- 2: This job asks for a little more experience than your resume shows.
- 1: This job asks for more experience than your resume shows.
- 0: This job asks for experience that your resume does not show yet.
- Not stated: This job does not state an experience level.

**Industry**
- 4: You know this industry well.
- 3: You have worked in this industry.
- 2: You have some experience in this industry.
- 1: You have worked in a related industry.
- 0: This industry is new for you.
- Not stated: This job does not state an industry.

**Education and certificates**
- 4: You have the education and certificates that this job asks for.
- 3: You have most of the education and certificates that this job asks for.
- 2: You have some of the education and certificates that this job asks for.
- 1: Your education is related to what this job asks for.
- 0: This job asks for education or certificates that your resume does not show yet.
- Not stated: This job does not state an education requirement.

**Tip** (Good match or lower):
> Do you have a skill or experience that is not in your resume? Add it, then assess the job again.

Words never used: "fail," "reject," "unqualified," "poor," "weak," "skip," "not a fit."

## 5. Messages

| Situation | Message |
|---|---|
| No resume is saved | Add your resume to start. |
| Chrome does not let extensions read the page | We cannot read this type of page. |
| The page is not a job posting | We could not find a job posting on this page. Open a job posting, or select the job text, and try again. |
| The job text was cut | We used the first part of the job text. |
| Too many requests in one minute | Please wait one minute, then try again. |
| Daily limit for the ID or the IP address | You assessed many jobs today. You can assess more after {time}. |
| Total daily cost limit | We are very busy today. Please try again after {time}. |
| Network or server error | We cannot assess this job now. Please try again in a few minutes. |

Daily limits reset at 00:00 UTC. `{time}` shows in the user's local time.

## 6. Server

- Vercel Function in a US region (`iad1`), at `shouldiapply.vercel.app` (`shouldi.vercel.app` belongs to another site).
- Holds the TypeSafe API key and owns the Jev questions. The extension sends only `{ resumeText, jobText }` and an `X-Install-Id` header.
- CORS: allows only the Should I Apply? extension origin(s).
- Rate limits:
  - **Layer 1 — Vercel Firewall:** 10 requests per minute per IP on `/api/assess`. Returns 429.
  - **Layer 2 — Upstash Redis:** 50 assessments/day per install ID, 200/day per IP hash, $5/day total cost. Keys expire at the next 00:00 UTC.
  - The server keeps only an HMAC hash of each IP address, never the address.
- Daily totals only (assessments, errors, blocked requests, input tokens/cost). No IDs, no IPs, no text.
- Serves the privacy policy at `/privacy`.

## 7. Code

pnpm workspace, public on GitHub under the MIT license.

- `apps/extension` — WXT, React, TypeScript. Popup + options page + unlisted text-reader script. pdf.js for PDF text.
- `apps/api` — one Vercel Function (`api/assess.ts`) with the TypeSafe JavaScript SDK, plus `public/privacy.html`.
- `packages/shared` — request/response types and Zod schemas, and the text limits.

No Jev accuracy test set (decision). Unit tests cover code logic only.

## 8. Chrome Web Store declarations

| Item | Entry |
|---|---|
| Single purpose | Assess how well the user's resume matches the job posting on the current page. |
| `activeTab` | Reads the job posting on the current tab, only after the user clicks the extension icon. |
| `scripting` | Runs the text reader (Mozilla Readability) on that tab to find the main job text. |
| `storage` | Keeps the resume, the name for removal, and the install ID on the user's computer, and the last result in memory. |
| Remote code | No. All code is in the extension package. |
| Data types | Personally identifiable information (resume text, IP address hash); Website content (job text). |
| Certifications | Not sold; not used for purposes other than the single purpose; not used to decide credit or loans. |
| Privacy policy URL | `https://shouldiapply.vercel.app/privacy` |

Contact email: `jbethuel.dev@gmail.com`

## 9. Tasks only the owner can do

1. Get a TypeSafe account and API key.
2. Get a Vercel account and install the Vercel CLI (`npm i -g vercel`).
3. Add Upstash Redis through the Vercel Marketplace.
4. Register a Chrome Web Store developer account (one-time fee of $5).
5. Create the contact email `jbethuel.dev@gmail.com`, if it does not exist yet.
