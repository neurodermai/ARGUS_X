"""
ARGUS-X — Red Team Router
Manual attack testing endpoint for the dashboard console.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
import time

router = APIRouter()


class RedTeamRequest(BaseModel):
    message: str
    attack_type: Optional[str] = "MANUAL"
    tier: int = 1


@router.post("/redteam")
async def redteam_test(req: RedTeamRequest, request: Request):
    """
    Manual red team test — run an attack against the live firewall.
    Returns detailed security analysis without going through LLM.
    """
    t0 = time.perf_counter()
    app = request.app

    # Run through firewall
    fw_result = await app.state.firewall.analyze(req.message)
    
    # Fingerprint
    threat_type = fw_result.get("threat_type") or req.attack_type
    fp = await app.state.fingerprinter.fingerprint(req.message, threat_type)
    
    # If blocked, run mutations
    mutations = 0
    if fw_result["blocked"]:
        mutations = await app.state.mutator.preblock_variants(
            req.message, threat_type, app.state.firewall
        )

    # XAI explanation
    xai = await app.state.xai.explain(
        req.message, fw_result, fingerprint_result=fp
    )

    elapsed = (time.perf_counter() - t0) * 1000

    return {
        "blocked": fw_result["blocked"],
        "sanitized": False,
        "threat_score": fw_result.get("score", 0),
        "score": fw_result.get("score", 0),
        "threat_type": threat_type,
        "method": fw_result.get("method", ""),
        "sophistication_score": fp.get("sophistication_score", 0),
        "fingerprint_id": fp.get("fingerprint_id", ""),
        "attack_fingerprint": fp.get("fingerprint_id", ""),
        "explanation": fp.get("explanation", ""),
        "mutations_preblocked": mutations,
        "xai": xai,
        "latency_ms": round(elapsed, 1),
    }
