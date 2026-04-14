"""
ARGUS-X — Explainable AI Engine (Layer 7)
Generates human-readable + machine-readable reasoning for every security decision.
Every blocked/sanitized event gets a full XAI breakdown.
"""
import logging
from typing import Dict, Any, List, Optional

log = logging.getLogger("argus.xai_engine")

# Pattern family descriptions
PATTERN_FAMILIES = {
    "INSTRUCTION_OVERRIDE":     "Direct instruction manipulation — attempting to override system prompt",
    "ROLE_OVERRIDE":            "Identity hijacking — attempting to change AI's behavioral constraints",
    "SYSTEM_PROMPT_EXTRACTION": "Prompt extraction — attempting to reveal system instructions",
    "DATA_EXFILTRATION":        "Data exfiltration — attempting to extract sensitive information",
    "INDIRECT_INJECTION":       "Indirect injection — attack embedded in structured formatting",
    "OBFUSCATED_INJECTION":     "Obfuscation attack — using encoding/l33t to evade keyword filters",
    "CONTEXT_OVERFLOW":         "Context overflow — padding input to push instructions out of window",
    "SOCIAL_ENGINEERING":       "Social engineering — using authority or urgency to bypass safety",
    "MULTI_TURN_ATTACK":        "Multi-turn jailbreak — building trust before delivering payload",
    "ADVERSARIAL_ENCODING":     "Adversarial encoding — using base64/hex/rot13 to hide payload",
    "CODE_INJECTION":           "Code injection — attempting to execute arbitrary code",
    "ML_DETECTED_INJECTION":    "ML-detected injection — caught by neural classifier, missed by regex",
}

# Recommended actions by severity tier
RECOMMENDATIONS = {
    "LOW":      "Monitor session. No immediate action required.",
    "MEDIUM":   "Flag session for review. Consider step-up authentication.",
    "HIGH":     "Escalate to SOC. Rate-limit this session immediately.",
    "CRITICAL": "Block session. Notify security team. Initiate incident response.",
}


class XAIEngine:
    """
    Generates structured explainability for every security decision.
    Output is both machine-readable (for dashboard) and human-readable (for SOC).
    """

    def __init__(self):
        log.info("✅ XAI Engine initialized")

    async def explain(
        self,
        message: str,
        fw_result: Dict[str, Any],
        audit_result: Dict[str, Any] = None,
        fingerprint_result: Dict[str, Any] = None,
        session_level: str = "LOW",
    ) -> Dict[str, Any]:
        """
        Generate full XAI reasoning structure for a decision.
        
        Returns:
            {
                layer_decisions: [...],
                primary_reason: str,
                pattern_family: str,
                evolution_note: str,
                recommended_action: str,
                confidence_breakdown: {...},
            }
        """
        layer_decisions = []
        
        # ── Layer: Regex Engine ───────────────────────────────────────────
        regex_confidence = fw_result.get("score", 0) if fw_result.get("method") == "REGEX_ENGINE" else 0
        layer_decisions.append({
            "layer_name": "Regex Rule Engine",
            "triggered": fw_result.get("blocked", False) and fw_result.get("method") == "REGEX_ENGINE",
            "confidence": round(regex_confidence * 100, 1),
            "signals": [fw_result.get("details", "")] if fw_result.get("blocked") else [],
            "reasoning": self._regex_reasoning(fw_result),
        })

        # ── Layer: ML Classifier ──────────────────────────────────────────
        _ml_methods = {"ONNX_ML_CLASSIFIER", "ONNX_DEBERTA_V3"}
        ml_confidence = fw_result.get("score", 0) if fw_result.get("method") in _ml_methods else 0
        layer_decisions.append({
            "layer_name": "ML Classifier",
            "triggered": fw_result.get("blocked", False) and fw_result.get("method") in _ml_methods,
            "confidence": round(ml_confidence * 100, 1),
            "signals": [fw_result.get("details", "")] if ml_confidence > 0.5 else [],
            "reasoning": self._ml_reasoning(fw_result),
        })

        # ── Layer: Output Auditor ─────────────────────────────────────────
        audit_confidence = 0
        if audit_result and audit_result.get("flagged"):
            audit_confidence = audit_result.get("confidence", 0)
        layer_decisions.append({
            "layer_name": "Output Auditor",
            "triggered": bool(audit_result and audit_result.get("flagged")),
            "confidence": round(audit_confidence * 100, 1),
            "signals": [f.get("name", "") for f in audit_result.get("findings", [])] if audit_result else [],
            "reasoning": self._audit_reasoning(audit_result),
        })

        # ── Primary Reason ────────────────────────────────────────────────
        threat_type = fw_result.get("threat_type") or (audit_result or {}).get("flag_reason") or "UNKNOWN"
        primary_reason = PATTERN_FAMILIES.get(threat_type, f"Threat detected: {threat_type}")

        # ── Pattern Family ────────────────────────────────────────────────
        pattern_family = threat_type

        # ── Sophistication-based note ─────────────────────────────────────
        soph_score = 0
        if fingerprint_result:
            soph_score = fingerprint_result.get("sophistication_score", 0)
        evolution_note = self._evolution_note(soph_score, session_level)

        # ── Recommended Action ────────────────────────────────────────────
        recommended_action = RECOMMENDATIONS.get(session_level, RECOMMENDATIONS["LOW"])
        if soph_score >= 7:
            recommended_action = RECOMMENDATIONS["HIGH"]
        if session_level == "CRITICAL" or soph_score >= 9:
            recommended_action = RECOMMENDATIONS["CRITICAL"]

        return {
            "layer_decisions": layer_decisions,
            "primary_reason": primary_reason,
            "pattern_family": pattern_family,
            "evolution_note": evolution_note,
            "recommended_action": recommended_action,
            "sophistication_score": soph_score,
            "session_threat_level": session_level,
            "confidence_breakdown": {
                "regex": round(regex_confidence * 100, 1),
                "ml": round(ml_confidence * 100, 1),
                "audit": round(audit_confidence * 100, 1),
            },
        }

    def _regex_reasoning(self, fw_result: dict) -> str:
        if fw_result.get("blocked") and fw_result.get("method") == "REGEX_ENGINE":
            return f"Pattern matched with {fw_result.get('score', 0):.0%} confidence. Rule type: {fw_result.get('threat_type', 'UNKNOWN')}."
        return "No regex patterns triggered. Input passed static rule check."

    def _ml_reasoning(self, fw_result: dict) -> str:
        if fw_result.get("method") in {"ONNX_ML_CLASSIFIER", "ONNX_DEBERTA_V3"}:
            score = fw_result.get("score", 0)
            if score > 0.87:
                return f"Neural classifier detected injection with {score:.0%} confidence."
            elif score > 0.5:
                return f"ML scored {score:.0%} — below threshold but elevated. Monitoring."
            return f"ML confidence low ({score:.0%}). Input appears benign to classifier."
        return "ML classifier not available. Running in rule-only mode."

    def _audit_reasoning(self, audit_result: Optional[dict]) -> str:
        if not audit_result:
            return "Output audit not yet performed (input was blocked before LLM)."
        if audit_result.get("flagged"):
            return f"Output contained: {audit_result.get('flag_reason', 'policy violation')}. Response sanitized."
        return "Output passed all audit checks. No PII or policy violations detected."

    def _evolution_note(self, soph_score: int, session_level: str) -> str:
        if soph_score >= 8:
            return f"⚠️ HIGH SOPHISTICATION ({soph_score}/10) — This is a researched, deliberate attack."
        elif soph_score >= 5:
            return f"Moderate sophistication ({soph_score}/10) — Attacker using evasion techniques."
        elif soph_score >= 3:
            return f"Low sophistication ({soph_score}/10) — Common attack pattern."
        return "Minimal sophistication — trivially detected."
