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