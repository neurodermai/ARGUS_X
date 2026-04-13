"""
ARGUS-X — Analytics Router
Endpoints: /stats, /logs, /heatmap
"""
from fastapi import APIRouter, Request
from datetime import datetime

router = APIRouter()


@router.get("/analytics/stats")
async def get_stats(request: Request):
    """Get all dashboard stats in one call — shaped for frontend consumption."""
    app = request.app
    
    stats = await app.state.db.get_stats()
    
    # Enrich with live data
    red_status = app.state.red_agent.status()
    blue_status = app.state.blue_agent.status()
    correlator_status = app.state.correlator.status()
    
    # Calculate defense rate
    blocked = stats.get("blocked", 0)
    sanitized = stats.get("sanitized", 0)
    clean = stats.get("clean", 0)
    total = blocked + sanitized + clean
    defense_rate = round(blocked / max(total, 1) * 100, 1)
    protect_pct = round((blocked + sanitized) / max(total, 1) * 100, 1)
    
    # Evolution data
    evolution = app.state.evolution.get_evolution_report() if hasattr(app.state, 'evolution') else {}
    
    # Battle state
    battle_state = app.state.battle.get_state() if hasattr(app.state, 'battle') else {}

    # Mutation count from blue agent
    mutations_total = blue_status.get("mutations_spawned", 0)

    return {
        # Top-level stats for direct frontend access
        "blocked": blocked,
        "sanitized": sanitized,
        "clean": clean,
        "total": total,
        "defense_rate": defense_rate,
        "protect_pct": protect_pct,
        "mutations_preblocked": mutations_total + app.state.firewall.get_dynamic_rules_count(),
        
        # Nested details
        "stats": stats,
        "agent": red_status,
        "blue_agent": blue_status,
        "battle": battle_state,
        "correlator": correlator_status,
        "evolution": evolution,
        "campaigns": app.state.correlator.get_active_campaigns(),
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
