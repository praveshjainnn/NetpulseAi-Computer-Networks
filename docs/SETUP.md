# Local Setup — NetPulse AI

> **Just want to try it?** Use the live demo at [netpulseai.tanisheesh.in](https://netpulseai.tanisheesh.in) — no setup needed.
> This guide is for running NetPulse AI locally or self-hosting it.

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- A Groq API key (free tier at [console.groq.com](https://console.groq.com))
- A Supabase project (optional — history/replay features only; simulator runs without it)

---

## 1. Clone and install

```bash
git clone https://github.com/tanisheesh/NetPulseAI
cd NetPulseAI
```

**Backend:**

```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**

```bash
cd frontend
npm install
```

---

## 2. Environment variables

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```bash
# Required for AI explainability (Groq API)
GROQ_API_KEY=your_groq_api_key_here

# Optional — history and replay features
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Set to "production" to enable HSTS header
ENVIRONMENT=development
```

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys → Create API Key |
| `SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase dashboard → Settings → API → `anon` public key |

> If `GROQ_API_KEY` is omitted, the AI explainability panel is disabled but the simulator runs normally.
> If Supabase vars are omitted, history and replay are disabled; all simulation features work in-memory.

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 3. Database setup (optional)

If you want history persistence, apply the schema to your Supabase project:

1. Open your Supabase project → SQL Editor.
2. Paste and run the contents of `backend/db/schema.sql`.

This creates three tables (`simulation_runs`, `tick_snapshots`, `groq_decisions`) with the required indexes. The `IF NOT EXISTS` guards mean it is safe to re-run.

---

## 4. Run locally

**Start the backend (port 8000):**

```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`.
Swagger docs: `http://localhost:8000/docs`

**Start the frontend (port 3000):**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 5. Deploy to production

### Backend — Render

The `backend/render.yaml` is pre-configured for Render:

1. Push the repo to GitHub.
2. Create a new Render web service, connect the repo, set root directory to `backend/`.
3. Add env vars in the Render dashboard: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `ENVIRONMENT=production`.
4. Render auto-detects the `render.yaml` and uses `uvicorn main:app --host 0.0.0.0 --port $PORT` as the start command.

### Frontend — Vercel

1. Import the repo into Vercel.
2. Set root directory to `frontend/`.
3. Add env vars: `NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com`, `NEXT_PUBLIC_WS_URL=wss://your-render-service.onrender.com`.
4. Deploy — Vercel auto-detects Next.js.

---

## Known local-only limitations

- **Render cold starts** — the live demo runs on Render's free tier, which spins down after inactivity. The first request may take 30–60 s. Locally this doesn't apply.
- **Supabase Realtime** — if you're using a local Supabase instance via the CLI, WebSocket replay uses the hosted Supabase URL; point `SUPABASE_URL` at your hosted project for replay to work.
- **CORS** — running the frontend on a port other than 3000 requires adding that origin to the `allow_origins` list in `backend/api/routes.py`.
