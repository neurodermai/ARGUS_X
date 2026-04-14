"""
ARGUS-X — XAI Router
Endpoints: /xai/decisions, /xai/summary, /xai/replay/{decision_id}
"""
import html
import json
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()


@router.get("/xai/decisions")
async def get_xai_decisions(request: Request, limit: int = 20):
    """Get recent XAI decisions for the explainability stream."""
    app = request.app
    decisions = await app.state.db.get_recent_xai_decisions(limit)
    return {"decisions": decisions, "count": len(decisions)}


@router.get("/xai/summary")
async def get_xai_summary(request: Request):
    """Get XAI summary stats."""
    app = request.app
    decisions = await app.state.db.get_recent_xai_decisions(50)
    
    blocked_count = sum(1 for d in decisions if d.get("verdict") == "BLOCKED")
    sanitized_count = sum(1 for d in decisions if d.get("verdict") == "SANITIZED")
    
    avg_soph = 0
    if decisions:
        scores = [d.get("sophistication_score", 0) for d in decisions]
        avg_soph = round(sum(scores) / len(scores), 1)
    
    return {
        "total_decisions": len(decisions),
        "blocked": blocked_count,
        "sanitized": sanitized_count,
        "avg_sophistication": avg_soph,
    }


@router.get("/xai/replay/{decision_id}")
async def replay_xai_decision(decision_id: str, request: Request):
    """
    Attack Replay — Step through each layer's decision on a past attack.

    Returns the stored XAI decision as a sequential timeline that the
    frontend can animate step-by-step. Uses real stored data only.

    Example: GET /api/v1/xai/replay/abc123-def456
    """
    app = request.app

    # Fetch all recent decisions and find the matching one
    decisions = await app.state.db.get_recent_xai_decisions(100)
    target = None
    for d in decisions:
        if str(d.get("id", "")) == decision_id:
            target = d
            break

    if not target:
        raise HTTPException(status_code=404, detail="XAI decision not found")

    # Parse layer_decisions from stored JSONB
    layer_decisions_raw = target.get("layer_decisions", "[]")
    if isinstance(layer_decisions_raw, str):
        try:
            layer_decisions = json.loads(layer_decisions_raw)
        except (json.JSONDecodeError, TypeError):
            layer_decisions = []
    else:
        layer_decisions = layer_decisions_raw if isinstance(layer_decisions_raw, list) else []

    # Build sequential replay timeline
    timeline = []
    for i, ld in enumerate(layer_decisions):
        timeline.append({
            "step": i + 1,
            "layer_name": ld.get("layer_name", f"Layer {i+1}"),
            "triggered": ld.get("triggered", False),
            "confidence": ld.get("confidence", 0),
            "signals": ld.get("signals", []),
            "reasoning": html.escape(str(ld.get("reasoning", "")), quote=True),
        })

    # Parse confidence_breakdown
    conf_raw = target.get("confidence_breakdown", "{}")
    if isinstance(conf_raw, str):
        try:
            conf_breakdown = json.loads(conf_raw)
        except (json.JSONDecodeError, TypeError):
            conf_breakdown = {}
    else:
        conf_breakdown = conf_raw if isinstance(conf_raw, dict) else {}

    return {
        "decision_id": decision_id,
        "verdict": target.get("verdict", "UNKNOWN"),
        "sophistication_score": target.get("sophistication_score", 0),
        "primary_reason": html.escape(str(target.get("primary_reason", "")), quote=True),
        "pattern_family": target.get("pattern_family", ""),
        "evolution_note": html.escape(str(target.get("evolution_note", "")), quote=True),
        "recommended_action": target.get("recommended_action", ""),
        "confidence_breakdown": conf_breakdown,
        "timeline": timeline,
        "timestamp": target.get("created_at", ""),
    }

