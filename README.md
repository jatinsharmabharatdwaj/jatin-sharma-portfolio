# Jatin Sharma portfolio

A responsive, animated portfolio based on Jatin Sharma's resume, with an AI portfolio copilot. It features his work on AWARE at Primafelicitas, the Vendor Document Management System at Engineers India Limited, and a Gas Station Network Management System at TGT. The copilot is a portfolio feature; the resume does not list previous professional AI/LLM project experience.

Use the LIGHT/DARK control in the header to switch themes. Your choice is saved in this browser.

## Deploy to GitHub Pages

The repository includes a GitHub Actions workflow that deploys the static portfolio whenever you push to `main`. In the repository settings, open **Pages** and choose **GitHub Actions** as the publishing source. The hosted version uses the portfolio copilot's resume-grounded demo responses; GitHub Pages cannot run the Node.js API server, which is included for a separate Node-compatible host if you later want live AI answers.

## Run it

Requires Node.js 18 or newer. From this folder:

```sh
node server.js
```

Open http://localhost:3000. Without a key, the chat runs in demo mode. If you open `index.html` directly, the browser-only demo replies still work, but live AI requires running the local server. To enable live answers, set `OPENAI_API_KEY` in the server environment, then restart. Optionally set `OPENAI_MODEL` (default `gpt-4o-mini`) or `OPENAI_BASE_URL` for a compatible chat-completions endpoint. The API key is only read by the server and is never sent to the browser.

## Personalize further

- Add your LinkedIn and GitHub URLs if you want them shown.
- Add project screenshots or live links where you are allowed to share them. Do not include confidential company information.
- Keep the matching profile context and demo responses in `server.js` in sync with any resume updates.

The site uses Google Fonts when network access is available and falls back to system fonts. No build step or third-party packages are needed.
