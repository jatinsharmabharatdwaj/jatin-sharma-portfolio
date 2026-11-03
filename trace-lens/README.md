# TraceLens

TraceLens is a personal portfolio project by Jatin Sharma: a supply-chain impact workspace built around product passports, material batches, supplier evidence, and an AI analyst. It draws on the technical domains in Jatin's resume, while remaining a separate demo project and not company work.

## What it demonstrates

- Angular dashboard with responsive layouts, dark/light theme, filtering, CSV export, product creation, and product passport details.
- Express REST API with request validation, security headers, rate limiting, and a MongoDB/Mongoose product model.
- AI analyst that answers from supplied product records. With no key it uses transparent, deterministic demo responses; with `OPENAI_API_KEY` it calls a server-side OpenAI-compatible chat completions endpoint.
- Optional Climatiq estimate endpoint. It requires a real Climatiq factor ID and its required activity parameters; estimates return the provider's audit trail.
- Clearly labeled illustrative dataset. Sample footprints and dashboard aggregates are not measurements, supplier audits, or verified results.

## Run locally

Requires Node.js 20.19+ and npm. From this directory:

```sh
npm install
cp .env.example .env
npm run start:api
```

In another terminal, run `npm start` and open http://localhost:4200. The Angular development server proxies `/api` to the local Express service. The app works with sample data without credentials. Add `MONGODB_URI`, `OPENAI_API_KEY`, or `CLIMATIQ_API_KEY` to `.env` to enable those integrations. Keep secrets in the server environment; never put them in Angular code or `runtime-config.js`.

## Deploy

GitHub Pages hosts the static Angular demo at `/jatin-sharma-portfolio/trace-lens/`; it cannot run Node or store MongoDB data. The repository workflow builds and publishes both portfolio pages and TraceLens. The hosted experience uses illustrative sample data and its deterministic demo analyst by default.

For live AI, MongoDB persistence, or Climatiq estimates, deploy `server/` to a Node-compatible service, set its environment variables there, allow the Pages origin in `CLIENT_ORIGIN`, then set `TRACELENS_API_BASE` in `public/runtime-config.js` to that API's HTTPS origin before rebuilding. API credentials remain on the server. Use an origin you control and enforce HTTPS.

## Data notes

The seed products, suppliers, evidence completeness, and footprint figures are fictional demonstration records. Live Climatiq estimates are only meaningful when the user supplies accurate activity data and a suitable factor. AI responses are grounded in the request's product records and should be reviewed before business decisions.
