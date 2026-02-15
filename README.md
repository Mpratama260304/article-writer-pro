# ArticleWriterPro

AI-Powered Bulk Article Generator — a full-stack web application that generates SEO-optimized articles in bulk using AI APIs. Built with React, Express, SQLite, and TailwindCSS.

## Features

- **Bulk Article Generation** — Generate multiple SEO articles from keywords in one click
- **Project Management** — Organize articles into projects
- **Prompt Templates** — Customizable AI prompt templates with variables
- **Multiple Export Formats** — WordPress XML, HTML Bundle, Markdown Bundle
- **HTML Templates** — Customizable templates for HTML exports
- **Dark Theme UI** — Modern, responsive dark-themed interface
- **Portable SQLite Database** — No external database setup needed
- **Pre-configured AI API** — Works out of the box with BytePlus GLM

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS + React Router DOM
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **AI API**: BytePlus GLM (OpenAI-compatible)

## Quick Start

```bash
# Install dependencies
npm install

# Start development (frontend + backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The development server runs on:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Docker

### Build & Run with Docker Compose (recommended)

```bash
# Start in production mode (builds image automatically)
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The app will be available at **http://localhost:3001**. The SQLite database is persisted in the `./database/` directory on the host.

### Build Image Manually

```bash
# Build
docker build -t your-username/articlewriterpro:latest .

# Run
docker run -d \
  --name articlewriterpro \
  -p 3001:3001 \
  -v $(pwd)/database:/app/database \
  -e NODE_ENV=production \
  your-username/articlewriterpro:latest
```

### Push to DockerHub

```bash
docker login
docker tag your-username/articlewriterpro:latest your-username/articlewriterpro:latest
docker push your-username/articlewriterpro:latest
```

### Development with Docker

```bash
docker compose -f docker-compose.dev.yml up
```

This mounts the source code as a volume and runs both Vite and Express in dev mode with hot reload.

## Available Models

| Model Name | Model ID |
|-----------|----------|
| GLM 4.7 | glm-4-7-251222 |
| GLM 5 | glm-5 |
| Kimi K2 | kimi-k2 |
| DeepSeek V3.2 | deepseek-v3.2 |

## Project Structure

```
article-writer-pro/
├── server/           # Express backend
│   ├── index.js      # Server entry point
│   ├── database.js   # SQLite setup & migrations
│   ├── routes/       # API route handlers
│   └── services/     # AI & export services
├── src/              # React frontend
│   ├── components/   # Reusable UI components
│   └── pages/        # Page components
├── database/         # SQLite database (auto-created)
└── dist/             # Production build output
```

## License

MIT