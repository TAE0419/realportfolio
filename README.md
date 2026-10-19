# Real Portfolio

React/Vite portfolio. Application source and assets live in `portfolio/`.

## Portfolio Chatbot

The floating navigation sparkle opens the chatbot. Only `OPENAI_API_KEY` is
required; no Redis service is needed. See [CHATBOT_SETUP.md](CHATBOT_SETUP.md)
for setup, editable information and prompts, and the limitations of per-instance
request limits. Never commit real credentials.

## Local Development

Use Node.js 22.13 or newer within the 22.x release line and Git LFS.

```sh
git lfs install
git lfs pull
npm ci --prefix portfolio
npm run dev
```

```sh
npm run lint
npm test
npm run build
npm run preview
```

## Vercel

Import this repository with **Root Directory left at the repository root**.
The root `vercel.json` defines installation, build output and SPA routes.
Use Node.js **22.x**. Enable **Settings > Git > Git LFS**, then deploy (or
redeploy if a build ran before this setting was enabled).

Original PDFs are stored in Git LFS. During the build, referenced PDFs are
rendered into WebP pages. Only those page images are deployed, not the large
source PDFs. JSON image paths are resolved automatically by the build plugin.

Videos and other binary media remain source assets; avoid adding individual
non-LFS files larger than GitHub's 100 MiB file limit.
