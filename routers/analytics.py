"""
ARGUS-X — Analytics Router
Endpoints: /stats, /logs, /heatmap
"""
from fastapi import APIRouter, Request
from datetime import datetime

router = APIRouter()


@router.get("/analytics/stats")
async def get_stats(request: Request):
    """Get all dashboard stats in one call."""
    app = request.app
    
    stats = await app.state.db.get_stats()
    
    # Enrich with live data
    red_status = app.state.red_agent.status()
    correlator_status = app.state.correlator.status()
    
    # Calculate defense rate
    total = stats.get("blocked", 0) + stats.get("sanitized", 0) + stats.get("clean", 0)
    blocked = stats.get("blocked", 0)
    defense_rate = round(blocked / max(total, 1) * 100, 1)
    
    # Evolution data
    evolution = app.state.evolution.get_evolution_report() if hasattr(app.state, 'evolution') else {}
    
    return {
        "stats": stats,
        "defense_rate": defense_rate,
        "red_agent": red_status,
        "correlator": correlator_status,
        "evolution": evolution,
        "active_campaigns": app.state.correlator.get_active_campaigns(),
        "threat_velocity": app.state.correlator.get_threat_velocity(),
        "top_fingerprints": app.state.correlator.get_top_fingerprints(),
        "dynamic_rules_count": app.state.firewall.get_dynamic_rules_count(),
        "firewall_mode": app.state.firewall.mode(),
        "ml_threshold": app.state.firewall.get_threshold(),
        "ts": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/analytics/logs")
async def get_logs(request: Request, limit: int = 50):
    """Get recent event logs."""
    events = await request.app.state.db.get_recent_events(limit)
    return {"events": events, "count": len(events)}


@router.get("/analytics/heatmap")
async def get_heatmap(request: Request):
    """Get attack heatmap data (hour × day matrix)."""
    data = await request.app.state.db.get_attack_heatmap()
    return {"heatmap": data}


@router.get("/analytics/summary")
async def get_threat_summary(request: Request):
    """Get hourly threat summary."""
    data = await request.app.state.db.get_threat_summary()
    return {"summary": data}
