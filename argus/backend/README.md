# ARGUS-X — Autonomous AI Defense Operating System

> *"The AI that defends AI"* — Not a firewall. An immune system.

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/argus-x-backend.git
cd argus-x-backend

# Install
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your Supabase + API keys

# Run
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Architecture — 9 Layers

| Layer | Component | Description |
|-------|-----------|-------------|
| L1 | Supabase | PostgreSQL + Realtime infrastructure |
| L2 | Security Pipeline | Regex Firewall + ONNX ML + Output Auditor |
| L3 | Intelligence | Attack Fingerprinter + Threat Correlator |
| L4 | Mutation Engine | 50+ semantic variant pre-blocking |
| L5 | Battle Engine | AI vs AI autonomous combat |
| L6 | Learning | DBSCAN clustering + Evolution tracking |
| L7 | XAI Engine | Explainable reasoning per decision |
| L8 | Visualization | Frontend dashboard components |
| L9 | Command Center | Unified defense operations view |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/chat` | Full 9-layer security pipeline |
| POST | `/api/v1/redteam` | Manual attack testing |
| GET | `/api/v1/analytics/stats` | Dashboard stats |
| GET | `/api/v1/analytics/logs` | Recent events |
| GET | `/api/v1/battle/state` | AI vs AI battle state |
| GET | `/api/v1/xai/decisions` | XAI reasoning stream |
| GET | `/api/v1/clusters` | Threat clusters |
| GET | `/health` | System health |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (bypasses RLS — backend only) |
| `SUPABASE_ANON_KEY` | No | Anon key (respects RLS — for frontend) |
| `HF_MODEL_REPO` | No | HuggingFace model repo for ONNX |
| `ANTHROPIC_API_KEY` | No | For Claude LLM (falls back to mock) |
| `LLM_MODEL` | No | LiteLLM model identifier |

## License

MIT
