"""
ARGUS-X — Agents Router
Control the autonomous AI agents: pause, resume, status, force cycle.
"""
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/agents/status")
async def agents_status(request: Request):
    """Get status of all autonomous agents."""
    app = request.app
    return {
        "red_agent": app.state.red_agent.status(),
        "correlator": app.state.correlator.status(),
        "battle": app.state.battle.get_state() if hasattr(app.state, 'battle') else {},
        "blue_agent": app.state.blue_agent.status() if hasattr(app.state, 'blue_agent') else {},
    }


@router.post("/agents/pause")
async def pause_agents(request: Request):
    """Pause all autonomous agents."""
    app = request.app
    app.state.red_agent.pause()
    if hasattr(app.state, 'battle'):
        app.state.battle.pause()
    return {"status": "paused", "agents": ["red_agent", "battle_engine"]}


@router.post("/agents/resume")
async def resume_agents(request: Request):
    """Resume all autonomous agents."""
    app = request.app
    app.state.red_agent.resume()
    if hasattr(app.state, 'battle'):
        app.state.battle.resume()
    return {"status": "resumed", "agents": ["red_agent", "battle_engine"]}


@router.post("/agents/cycle")
async def force_cycle(request: Request):
    """Force one battle cycle."""
    app = request.app
    if hasattr(app.state, 'battle'):
        state = await app.state.battle.force_cycle()
        return {"status": "cycle_complete", "battle_state": state}
    return {"status": "battle_engine_not_available"}
