# Chrome Web Store listing

Everything to paste into the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) for **Should I Apply?** (item ID `ghpgfojflbhaakbbkjgmlbnnfhfpboej`).

## Package

Upload `apps/extension/build/shouldiextension-<version>-chrome.zip` (from `pnpm zip`). For every update, raise `version` in `apps/extension/package.json` first; the store rejects a version it has seen.

## Store listing

- **Title** and **Summary** come from the manifest: "Should I Apply?" and "See how your resume matches a job."
- **Description:**

  ```
  Should I Apply? shows how well your resume matches the job posting you are looking at.

  Open the extension on a job posting and click Assess. You get:
  • An overall match level: Excellent, Strong, Good, Partial, or Early match
  • One line for each part of the job: skills, tasks, experience level, industry, and education
  • A tip on what to add to your resume when the match is lower

  Encouraging by design
  No percentages and no harsh words. The results show where you are strong and what to work on next.

  Private by design
  • Your resume is saved only in Chrome on your computer.
  • Before anything is sent, the extension removes email addresses, phone numbers, links, and your name.
  • The extension reads a page only when you click its icon, and sends text only when you click Assess.
  • Our server does not store your resume or the job text. The AI provider (TypeSafe) does not train on it.
  • "Delete all my data" removes everything from your computer.

  How to use it
  1. Open the settings page and add your resume (PDF or pasted text).
  2. Open a job posting and click the extension icon.
  3. Check the job text, then click Assess. To assess only part of a page, select that text first.

  Privacy policy: https://shouldiapply.vercel.app/privacy
  ```

- **Category:** Productivity (Tools, or Workflow & Planning).
- **Language:** English.
- **Store icon (128×128):** `apps/extension/public/icon/128.png`
- **Screenshots (1280×800), in this order:** `store/images/screenshot-1-match.png` … `screenshot-5-sent.png`
- **Small promo tile (440×280, required):** `store/images/promo-small-440x280.png`
- **Marquee (1400×560, optional):** `store/images/promo-marquee-1400x560.png`
- **Homepage URL:** `https://shouldiapply.vercel.app` (or the GitHub repository, if it is public)
- **Mature content:** No

## Privacy

**Single purpose**

```
Should I Apply? assesses how well the user's resume matches the job posting on the current page, and shows an encouraging match level for each part of the job.
```

**activeTab justification**

```
Should I Apply? reads the job posting on the tab where the user clicks the extension icon. activeTab gives access to that one tab, only after the click. The extension does not read other tabs, does not run in the background on web pages, and has no host permissions.
```

**scripting justification**

```
Used with activeTab to run the extension's own text reader (Mozilla Readability, bundled in the package) once on the current tab, after the user opens the popup. It returns the main text of the job posting, or only the text the user selected, to the popup so the user can check it before clicking Assess. It does not change the page and never runs without the user's click.
```

**storage justification**

```
chrome.storage.local keeps the user's resume text, the name they enter for removal, and a random install ID on their computer, so they do not have to add their resume each time. chrome.storage.session keeps the last result for each tab in memory only, so reopening the popup does not send a new request; Chrome clears it when the browser closes. The user can delete everything with "Delete all my data" on the settings page.
```

**Remote code:** No, I am not using remote code.

**Data usage — check these three:**

| Data type | Why |
|---|---|
| Personally identifiable information | The resume text is sent for the assessment. Contact details are removed first, but work history can still identify a person. |
| Location | The store lists IP addresses under Location. The server keeps a keyed hash of the IP address for up to 24 hours for rate limits. |
| Website content | The job posting text is sent for the assessment. |

Leave the others unchecked (health, financial, authentication, personal communications, web history, user activity).

**Certifications — check all three:**

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://shouldiapply.vercel.app/privacy`

## Distribution

- **Payments:** Free
- **Visibility:** Public (or Unlisted to try the store version first)
- **Regions:** All regions

## Test instructions

Leave username and password empty.

```
No account or login is needed.

1. After install, the settings page opens (or click the extension icon, then "Settings").
2. Paste this sample resume into "Your resume" and click Save:

   Alex Rivera
   alex.rivera@example.com · +1 415 555 0142
   Senior Frontend Engineer
   Experience
   Acme Payments - Senior Frontend Engineer, 2020 - 2026
   - Led a team of 4 engineers building the merchant dashboard in React and TypeScript.
   - Built a design system used by 6 product teams.
   BrightLedger - Frontend Engineer, 2017 - 2020
   - Built reporting screens with React and Redux.
   Skills: TypeScript, React, Next.js, GraphQL, accessibility (WCAG)
   Education: BS Computer Science

   Optional: type "Alex Rivera" in "Your name", then open "Show the text that we send". The name, email, and phone number show as [removed].

3. Open the sample job posting: https://shouldiapply.vercel.app/sample-job
4. Click the extension icon. The popup shows the job text it found. Click "Assess".
5. Expected: a match label (for example "Strong match" or "Excellent match") and one line for each criterion. The result appears in a few seconds.

Other things to try:
- Select part of the job text before clicking the icon. The popup then says "Your selection" and assesses only that text.
- Open a page that is not a job posting (for example https://example.com). The extension says it could not find a job posting.

Notes: The resume is saved only in Chrome storage. Text is sent to our API only when you click "Assess". Each install can run 50 assessments per day.
```

## API access

The API accepts only these extension origins (`ALLOWED_ORIGINS` in Vercel, production and preview):

- `chrome-extension://ghpgfojflbhaakbbkjgmlbnnfhfpboej` — the store item (reviewers and users)
- `chrome-extension://abjdbeaendlammibfbbambeebeffdekp` — the unpacked build loaded from `apps/extension/build/chrome-mv3` on the owner's Mac

A copy loaded from another folder has another ID; add it to `ALLOWED_ORIGINS` and redeploy.
