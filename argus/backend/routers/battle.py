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
    try:
        app = request.app
        if app.state.db.available:
            result = await app.state.db._run_sync(
                lambda: app.state.db.client.table("battle_state")
                    .select("*")
                    .order("last_update", desc=True)
                    .limit(limit)
                    .execute()
            )
            return {"history": result.data if result.data else []}
    except Exception:
        pass
    return {"history": []}
