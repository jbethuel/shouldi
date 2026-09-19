# Should I Apply?

See how your resume matches a job. Should I Apply? is a Chrome extension. On a job posting, it shows an encouraging match label and one level for each criterion: skills, tasks, experience level, industry, and education. The assessment comes from [Jev](https://docs.typesafe.ai) (TypeSafe).

The full design and all decisions are in [PLAN.md](PLAN.md).

## Privacy in one paragraph

The resume is saved only in Chrome on your computer. When you click **Assess**, the extension removes email addresses, phone numbers, links, and your name, then sends the resume text and the job text to the Should I Apply? API. The API sends them to TypeSafe and returns the result. The API does not save the text or write it to logs. No history is kept. See [the privacy policy](apps/api/public/privacy.html).

## Repository

| Path | What it is |
|---|---|
| `apps/extension` | Chrome extension (WXT, React, TypeScript). Popup, settings page, and the page text reader. |
| `apps/api` | Vercel Function `api/assess.ts`, which holds the TypeSafe key and the Jev questions, plus the privacy page. |
| `packages/shared` | Request and response types and Zod schemas used by both apps. |

## Develop

Requirements: Node.js 20+, pnpm.

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build          # builds the shared package, the API check, and the extension
```

Tests use Vitest. The extension tests run against WXT's in-memory fake browser, and the screen tests use jsdom and Testing Library. Nothing calls the real TypeSafe API. CI (`.github/workflows/ci.yml`) runs the typecheck, the tests, and the build on every push to `main` and every pull request, and uploads the extension build as an artifact. For a coverage report, run `pnpm test:coverage` in `apps/api` or `apps/extension`. Tests for single-file entry points are in `apps/extension/test/`, because WXT treats every file directly in `entrypoints/` as an entry point.

### Extension

```sh
cd apps/extension
cp .env.example .env   # set WXT_API_URL (default https://shouldiapply.vercel.app)
pnpm dev               # opens Chrome with the extension loaded
pnpm build             # output in build/chrome-mv3 (use "Load unpacked" in chrome://extensions)
pnpm zip               # zip for the Chrome Web Store
pnpm store:images      # Chrome Web Store screenshots and promo tiles in store/images (needs Google Chrome)
```

`pnpm store:images` renders the real built popup and settings pages with invented sample data (see `store/shim.js`) and captures them with headless Chrome at the sizes the store asks for: five 1280×800 screenshots, the 440×280 small promo tile, and the 1400×560 marquee.

### API

```sh
npm i -g vercel
cd apps/api
vercel link            # set the project Root Directory to apps/api
vercel env pull .env   # after you add the variables below
vercel dev
```

Environment variables (see `apps/api/.env.example`):

| Name | Purpose |
|---|---|
| `TYPESAFE_API_KEY` | TypeSafe API key. Required. |
| `TYPESAFE_MODEL` | Default `jev-latest`. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis. The Vercel Marketplace integration sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`, which also work. |
| `IP_HASH_SECRET` | Random secret for the IP hash (`openssl rand -hex 32`). Required. |
| `ALLOWED_ORIGINS` | `chrome-extension://<id>` of the published extension. Leave empty only in development (then any extension origin is allowed). |
| `LIMIT_PER_INSTALL_PER_DAY`, `LIMIT_PER_IP_PER_DAY`, `DAILY_COST_LIMIT_USD` | Defaults 50, 200, 5. |

## Deploy

1. **TypeSafe:** create an account and an API key.
2. **Vercel project:** import the repository and set **Root Directory** to `apps/api`. The build command in `apps/api/vercel.json` builds the shared package. The region is `iad1` (US East), close to TypeSafe.
   - If the install step fails because of the pnpm version, add the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the version in `packageManager`.
3. **Upstash Redis:** in the Vercel dashboard, open **Storage**, add **Upstash for Redis**, and connect it to the project. Use a US region.
4. **Environment variables:** add `TYPESAFE_API_KEY` and `IP_HASH_SECRET` (and later `ALLOWED_ORIGINS`) with `vercel env add`.
5. **Rate limit, layer 1 (Vercel Firewall):** 10 requests per minute per IP. Start in log mode, check the Firewall dashboard, then enforce:

   ```sh
   vercel firewall rules add "Rate limit assess" \
     --condition '{"type":"path","op":"eq","value":"/api/assess"}' \
     --condition '{"type":"method","op":"eq","value":"POST"}' \
     --action rate_limit --rate-limit-window 60 --rate-limit-requests 10 \
     --rate-limit-keys ip --rate-limit-action log --yes
   vercel firewall publish --yes
   # After the review: edit the rule with --rate-limit-action rate_limit and publish again.
   ```

   Layer 2 (daily limits and the daily cost cap) is in the function code and uses Redis.
6. **Chrome Web Store:** register a developer account ($5 one-time), upload the zip from `pnpm zip`, and fill in the Privacy tab from [PLAN.md §8](PLAN.md#8-chrome-web-store-declarations). After the store gives the extension its ID, set `ALLOWED_ORIGINS=chrome-extension://<id>` and redeploy.
7. **Privacy policy:** when you change `apps/api/public/privacy.html`, update its effective date and redeploy.

## License

[MIT](LICENSE)
