"""
ARGUS-X — XAI Router
Endpoints: /xai/decisions, /xai/summary
"""
from fastapi import APIRouter, Request

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
