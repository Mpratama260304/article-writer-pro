# ArticleWriterPro

AI-powered bulk article generator — a full-stack web app that generates SEO-optimized articles in bulk using any OpenAI-compatible AI API. Built with React + Vite + TailwindCSS (frontend) and Node.js + Express + SQLite (backend), written in TypeScript.

## Features

- **Bulk article generation** from keywords with live progress and cancellation
- **Project management** to organize articles
- **Prompt templates** with variables and strict JSON output mode
- **HTML export templates**
- **Multiple export formats** — WordPress XML, HTML ZIP, Markdown ZIP
- **Secure admin authentication** with a first-run setup wizard
- **Encrypted AI API key** storage — the key is never exposed to the browser
- **Zero-env Docker deployment** — boots with safe defaults, no `.env` required
- **Dark, responsive UI**

## Security model (read this)

- **No credentials ship with the app.** There are no API keys, passwords, or
  secrets in the source, seed files, Dockerfile, docker-compose, or image.
- On first boot the app generates a random **app secret** at `/app/data/app-secret`
  used to sign sessions and **encrypt** the stored AI API key (AES-256-GCM).
- The AI API key is entered through the **browser setup wizard**, stored
  encrypted, and only ever returned to the UI **masked** (e.g. `sk-1****wxyz`).
- All dashboard and API routes require an authenticated admin session.

> Never hardcode real API keys in source, Dockerfile, seed files, or commits.
> Always mount `/app/data` as a persistent volume so the database and app
> secret survive redeploys.

## Quick start (local)

```bash
npm install
npm run dev        # frontend (5173) + backend (3001)
```

Then open the **setup URL printed in the server logs** (`/setup?token=…`) to
create the admin account and configure the AI provider.

Other commands:

```bash
npm run typecheck  # TypeScript checks
npm test           # unit tests
npm run build      # production frontend build
npm start          # production server (serves built SPA + API)
```

## First-run setup

1. Start the app (locally, Docker, or Railway).
2. Open the **setup link printed in the logs**:
   `http://<your-host>/setup?token=<one-time-token>`.
3. Enter the admin username/email/password and AI provider details
   (provider name, base URL, model, API key, defaults).
4. Submit — the admin is created and the AI key is stored encrypted.
5. The setup token is invalidated and you are redirected to `/login`.

## Docker

### Docker Compose (recommended)

```bash
docker compose up -d        # http://localhost:3001
docker compose logs -f      # find the setup URL/token
docker compose down
```

The database and app secret are persisted in `./data` on the host (mounted to
`/app/data`).

### Build & run manually

```bash
docker build -t your-username/article-writer-pro:latest .

docker run -d \
  --name article-writer-pro \
  -p 3001:3001 \
  -v "$(pwd)/data:/app/data" \
  your-username/article-writer-pro:latest
```

No `-e` environment variables are required. Check the logs for the setup URL:

```bash
docker logs -f article-writer-pro
```

### Push to DockerHub

```bash
docker login
docker build -t your-username/article-writer-pro:latest .
docker push your-username/article-writer-pro:latest
```

## Deploy to Railway (without `.env`)

1. Create a new Railway service from your DockerHub image
   (`your-username/article-writer-pro:latest`) or from this repo.
2. **No environment variables are required** to boot.
3. **Add a persistent volume mounted at `/app/data`** (Railway → service →
   Volumes). This keeps the database and app secret across redeploys.
4. Deploy, open the service logs, and use the printed `/setup?token=…` URL with
   your Railway public domain to complete first-run setup.

> ⚠️ Without a volume at `/app/data`, the database and the app secret are
> regenerated on each redeploy — your data and login will be lost.

## Easypanel / VPS

- Run the image with a bind mount or named volume at `/app/data`.
- Put it behind your reverse proxy (Nginx/Caddy/Traefik). `TRUST_PROXY` defaults
  to `true` so client IPs and secure cookies work correctly.
- Open `/setup?token=…` (from the logs) using your public URL.

## Optional advanced configuration (`.env`)

The app is **zero-env** by default. Advanced users may copy
[`.env.example`](.env.example) to `.env` to override non-secret settings
(`PORT`, `DATA_DIR`, `CORS_ORIGINS`, rate limits, `APP_SECRET`, etc.). Do not
put real AI API keys in `.env` — use the setup wizard.

## Development with Docker

```bash
docker compose -f docker-compose.dev.yml up
```

Mounts the source and runs Vite + Express with hot reload.

## Project structure

```
article-writer-pro/
├── server/                 # Express + TypeScript backend
│   ├── index.ts            # App entry, security + route wiring
│   ├── database.ts         # SQLite open + migrations + seed
│   ├── config/             # Zero-env config loader
│   ├── db/                 # migrations.ts, seed.ts
│   ├── lib/                # paths, appSecret, crypto, jwt
│   ├── middleware/         # security, auth
│   ├── schemas/            # Zod validation
│   ├── routes/             # API route handlers
│   └── services/           # settings, auth, setup, audit, ai, export
├── src/                    # React + Vite frontend
│   ├── api/                # centralized API client
│   ├── context/            # AuthContext
│   ├── components/         # UI + ProtectedRoute
│   └── pages/              # Setup, Login, dashboard pages
├── data/                   # Persistent runtime data (gitignored)
└── dist/                   # Production build output
```

## Troubleshooting

- **Lost the setup link?** Restart the service and read the logs again; the
  token regenerates while setup is still required.
- **Logged out after redeploy?** Mount a persistent volume at `/app/data`.
- **AI "not configured" error?** Complete setup or add the provider details in
  Settings, then use **Test Connection**.
- **Behind a proxy but cookies fail?** Ensure HTTPS in production (secure
  cookies) and that `TRUST_PROXY` is `true` (default).

## License

MIT
