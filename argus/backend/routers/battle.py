"""
ARGUS-X — Battle Router
Endpoints: /battle/state, /battle/history
"""
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/battle/state")
async def get_battle_state(request: Request):
    """Get current AI vs AI battle state."""
    app = request.app
    if hasattr(app.state, 'battle'):
        return app.state.battle.get_state()
    # Fallback to DB
    state = await app.state.db.get_battle_state()
    return state if state else {"status": "NOT_STARTED", "tick": 0}


@router.get("/battle/history")
async def get_battle_history(request: Request, limit: int = 20):
    """Get recent battle ticks from database."""
    history = await request.app.state.db.get_battle_history(limit)
    return {"history": history}
