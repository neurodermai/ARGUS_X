# ARGUS-X — Deployment Guide

Complete step-by-step production deployment for **Supabase + Railway + Frontend**.

---

## 1. Supabase Setup

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to your Railway deployment
3. Save the generated **database password** securely

### 1.2 Run Schema SQL

1. Go to **SQL Editor** → **New Query**
2. Paste the entire contents of `argus/backend/supabase_schema_v3.sql`
3. Click **Run** — you should see:
   ```
   ✅ ARGUS-X Schema v3.0 created successfully
   ```

### 1.3 Add Unique Constraint for Dynamic Rules

Run this additional SQL to support rule deduplication:

```sql
-- Required for dynamic rule UPSERT deduplication
ALTER TABLE dynamic_rules ADD CONSTRAINT unique_dynamic_rule_pattern UNIQUE (pattern);
```

### 1.4 Enable Realtime

1. Go to **Database** → **Replication**
2. Enable Realtime for these tables:
   - `events`
   - `battle_state`
   - `campaigns`
   - `xai_decisions`
   - `red_team_sessions`
   - `attack_fingerprints`

### 1.5 Get Your Keys

Go to **Settings** → **API** and copy:

| Key | Where to find | Use |
|-----|---------------|-----|
| **Project URL** | `https://xxxx.supabase.co` | `SUPABASE_URL` env var |
| **anon public** key | Under "Project API keys" | `SUPABASE_ANON_KEY` env var |
| **service_role** key | Under "Project API keys" (click "Reveal") | `SUPABASE_SERVICE_KEY` env var |

> [!CAUTION]
> The **service_role** key bypasses all Row Level Security. NEVER expose it in frontend code, logs, or error messages. It goes in Railway env vars ONLY.

### 1.6 Verify RLS

Run this SQL in the SQL Editor to verify all tables have RLS enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Every table should show `rowsecurity = true`.

Verify policies exist:

```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see:
- **anon** read policies on: `stats`, `battle_state`, `evolution_log`, `campaigns`, `attack_fingerprints`, `events`, `xai_decisions`, `threat_clusters`
- **service_role** write policies on all tables
- **NO anon** policies on: `red_team_sessions`, `dynamic_rules`, `knowledge_base`

---

## 2. Railway Deployment

### 2.1 Create Service

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your ARGUS-X repository
3. Railway will auto-detect the `Dockerfile` via `railway.json`

### 2.2 Set Environment Variables

Go to your service → **Variables** → **Raw Editor** and paste:

```env
# === REQUIRED ===
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...YOUR_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=eyJhbGci...YOUR_ANON_KEY
API_KEY=GENERATE_WITH_python_-c_"import secrets; print(secrets.token_urlsafe(32))"
ENV=production
FRONTEND_URL=https://YOUR_RAILWAY_DOMAIN.railway.app

# === OPTIONAL ===
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-haiku-20241022
HF_MODEL_REPO=
REDIS_URL=
SENTRY_DSN=
LOG_LEVEL=INFO
```

### 2.3 Generate API Key

Run this locally to generate a secure API key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and set it as `API_KEY` in Railway.

### 2.4 Set FRONTEND_URL

After Railway assigns your domain (e.g., `https://argus-x-production.up.railway.app`):

1. Go to **Settings** → **Networking** → **Generate Domain** (or add custom domain)
2. Copy the full URL (with `https://`)
3. Set `FRONTEND_URL` to this exact URL in Variables

> [!IMPORTANT]
> `FRONTEND_URL` must exactly match your deployment URL including protocol. No trailing slash. No wildcard.

### 2.5 Verify Deployment

After Railway builds and deploys:

```bash
# Health check
curl https://YOUR_DOMAIN.railway.app/health

# Expected response:
# {
#   "status": "operational",
#   "service": "ARGUS-X",
#   "version": "3.0.0",
#   "layers": { "L1_database": true, ... }
# }
```

```bash
# Test API auth (should return 401 without key)
curl https://YOUR_DOMAIN.railway.app/api/v1/analytics/stats
# → {"detail":"Missing X-API-Key header"}

# Test with key (should return stats)
curl -H "X-API-Key: YOUR_API_KEY" https://YOUR_DOMAIN.railway.app/api/v1/analytics/stats
# → {"blocked":0,"sanitized":0,...}
```

### 2.6 Verify Startup Logs

In Railway → **Deployments** → latest → **View Logs**, confirm:

```
🛡️  ARGUS-X booting up — initializing all 9 layers...
🔐 API_KEY is configured — endpoint authentication is ENABLED
✅ Supabase write client connected (service role)
✅ Supabase read client connected (anon — RLS enforced)
✅ Input Firewall initialized (REGEX+ML mode) OR (REGEX-ONLY mode)
✅ LLM Core initialized (model: claude-3-5-haiku-20241022) OR (MOCK mode)
📦 Loaded N dynamic rules from DB  (if any exist)
✅ ARGUS-X fully operational — all 9 layers active
🔴 Red Team Agent autonomous loop started
🔗 Threat Correlator loop started
⚔️ Battle Engine started
```

---

## 3. Frontend

### 3.1 Docker-Embedded (Default — Railway)

The `Dockerfile` includes a Node.js build stage that:
1. Installs frontend dependencies (`npm ci`)
2. Builds the Vite app (`npm run build`)
3. Copies `/dist` into the backend container

The Python backend serves these built assets automatically. **No separate frontend deployment needed.**

The frontend auto-detects the backend URL when served from the same origin. No `VITE_API_URL` configuration required.

### 3.2 Separate Deployment (Vercel — Optional)

If you prefer to deploy frontend separately on Vercel:

1. **Import** the repo on Vercel
2. Set **Root Directory** to `argus/frontend`
3. Set **Build Command** to `npm run build`
4. Set **Output Directory** to `dist`
5. Add environment variables:
   ```
   VITE_API_URL=https://YOUR_RAILWAY_BACKEND.railway.app
   VITE_WS_URL=wss://YOUR_RAILWAY_BACKEND.railway.app
   ```
6. Update Railway's `FRONTEND_URL` to match the Vercel URL

### 3.3 Local Development

```bash
# Terminal 1: Backend
cd argus/backend
cp ../../.env.example .env   # Edit with your keys
pip install -r requirements.txt
python main.py

# Terminal 2: Frontend
cd argus/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

Set `ARGUS_API_KEY` in browser localStorage for authenticated access:
```javascript
// In browser console:
localStorage.setItem('ARGUS_API_KEY', 'your-api-key-here');
// Then refresh the page
```

---

## 4. WebSocket Debugging

### 4.1 Auth-After-Connect Protocol

ARGUS-X uses auth-after-connect for WebSocket security:

1. Client connects to `wss://domain/ws/live` (no token in URL)
2. Client sends: `{"type": "auth", "token": "YOUR_API_KEY"}`
3. Server validates within 10 seconds
4. If invalid → server closes with code **4003**
5. If timeout → server closes with code **4003**
6. If connection limit reached → server closes with code **4008**

### 4.2 Testing with wscat

```bash
# Install
npm install -g wscat

# Connect
wscat -c wss://YOUR_DOMAIN.railway.app/ws/live

# When connected, immediately type:
{"type":"auth","token":"YOUR_API_KEY"}

# You should receive history events:
# {"type":"history","data":{...}}
# {"type":"history","data":{...}}
# ... then periodic pings:
# {"type":"ping","ts":"2025-..."}
```

### 4.3 Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Instant disconnect (4003) | Wrong API key | Check `API_KEY` env var matches what frontend sends |
| Disconnect after 10s (4003) | Auth message never sent | Check frontend sends `{"type":"auth","token":"..."}` on `onopen` |
| Connection refused | CORS or firewall | Ensure `FRONTEND_URL` is set correctly |
| No events received | No traffic | Send a chat message via API to generate events |
| "connection limit reached" (4008) | Too many open tabs | Close other tabs or increase `MAX_WS_CLIENTS` |

### 4.4 Browser Console Debugging

```javascript
// Check if API key is set
console.log('API Key:', localStorage.getItem('ARGUS_API_KEY') ? 'SET' : 'NOT SET');

// Monitor WebSocket state
// Open Network tab → WS → select the connection
// Messages tab shows all frames
```

---

## 5. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes (for DB) | — | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes (for DB) | — | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Recommended | — | Anon key (respects RLS for reads) |
| `API_KEY` | **Yes (production)** | — | Protects all `/api/v1` endpoints and WebSocket |
| `ENV` | Yes | `development` | Set to `production` for Railway |
| `FRONTEND_URL` | Yes (production) | `http://localhost:5173` | Exact frontend origin for CORS |
| `ANTHROPIC_API_KEY` | No | — | For Claude LLM (mock mode without) |
| `OPENAI_API_KEY` | No | — | For GPT LLM (mock mode without) |
| `LLM_MODEL` | No | `claude-3-5-haiku-20241022` | LiteLLM model identifier |
| `HF_MODEL_REPO` | No | — | HuggingFace repo for ML model |
| `HF_TOKEN` | No | — | HuggingFace auth token |
| `MODEL_DIR` | No | `./models` | Local model storage directory |
| `REDIS_URL` | No | — | Redis for persistent sessions |
| `SENTRY_DSN` | No | — | Sentry error tracking |
| `LOG_LEVEL` | No | `INFO` | Logging verbosity |
| `PORT` | No | `8000` | Server port (Railway sets automatically) |
| `REDTEAM_TOKEN` | No | — | Extra auth for red team endpoints |
| `DEMO_BYPASS_ENABLED` | No | `false` | Skip security pipeline (demo only) |

---

## 6. Post-Deployment Checklist

- [ ] Health endpoint returns `"status": "operational"`
- [ ] All 9 layers show as active in health response
- [ ] API returns 401 without `X-API-Key` header
- [ ] API returns data with valid `X-API-Key` header
- [ ] WebSocket connects and receives history events
- [ ] WebSocket rejects with 4003 on bad auth
- [ ] Dashboard shows real-time events (send a chat message to test)
- [ ] Battle Engine ticks appear in logs every 60 seconds
- [ ] Red Agent cycle runs every 60 seconds
- [ ] No secrets visible in Railway logs (check for JWT patterns)
- [ ] `FRONTEND_URL` is not `*` (server would crash)
- [ ] RLS is enabled on all Supabase tables
