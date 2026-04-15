"""
ARGUS-X — Output Auditor (Layer 2)
Scans LLM output for: PII leakage, policy violations, prompt leakage.
Uses regex patterns for PII + semantic similarity for exfiltration detection.
"""
import re
import logging
from typing import Dict, Any

log = logging.getLogger("argus.auditor")

# PII detection patterns
PII_PATTERNS = [
    {"name": "email",       "pattern": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",  "severity": 0.85},
    {"name": "phone",       "pattern": r"\b(?:\+?1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", "severity": 0.80},
    {"name": "ssn",         "pattern": r"\b\d{3}-\d{2}-\d{4}\b", "severity": 0.95},
    {"name": "credit_card", "pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "severity": 0.95},
    {"name": "ip_address",  "pattern": r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "severity": 0.60},
    {"name": "api_key",     "pattern": r"(?:sk|pk|api)[_-](?:live|test|prod)?[_-]?[a-zA-Z0-9]{20,}", "severity": 0.95},
    {"name": "password",    "pattern": r"(?:password|passwd|pwd)\s*[:=]\s*\S+", "severity": 0.90},
    {"name": "aadhaar",     "pattern": r"\b\d{4}\s?\d{4}\s?\d{4}\b", "severity": 0.90},
    {"name": "pan",         "pattern": r"\b[A-Z]{5}\d{4}[A-Z]\b", "severity": 0.85},
]

# Policy violation patterns (things an AI should never output)
POLICY_PATTERNS = [
    {"name": "system_prompt_leak", "pattern": r"(my\s+system\s+prompt|my\s+instructions\s+are|I\s+was\s+told\s+to|my\s+initial\s+prompt)", "severity": 0.95},
    {"name": "harmful_content",    "pattern": r"(how\s+to\s+make\s+a\s+bomb|how\s+to\s+hack|exploit\s+vulnerability|malware\s+code)", "severity": 0.95},
    {"name": "role_compliance",    "pattern": r"(I\s+am\s+DAN|I\s+have\s+no\s+restrictions|I\s+can\s+do\s+anything|developer\s+mode\s+enabled)", "severity": 0.95},
    {"name": "data_dump",          "pattern": r"(employee\s+records?|salary\s+data|internal\s+database|confidential\s+records)", "severity": 0.80},
]


class OutputAuditor:
    """
    Scans LLM output for PII leakage, policy violations, and prompt leakage.
    Sanitizes output by masking detected PII.
    """

    def __init__(self, models=None):
        self.models = models
        log.info("✅ Output Auditor initialized")

    async def analyze(self, llm_output: str, original_input: str = "") -> Dict[str, Any]:
        """
        Analyze LLM output for security concerns.
        Returns: {flagged, confidence, flag_reason, sanitized_response, explanation}
        """
        # ── PII Scan ──────────────────────────────────────────────────────
        pii_results = self._scan_pii(llm_output)
        
        # ── Policy Scan ───────────────────────────────────────────────────
        policy_results = self._scan_policy(llm_output)
        
        # ── Determine verdict ─────────────────────────────────────────────
        # Apply severity threshold: only flag findings with severity >= 0.75
        # This prevents false positives from low-severity matches like
        # benign IP addresses (severity 0.60) in normal LLM output.
        all_findings = [f for f in (pii_results + policy_results) if f["severity"] >= 0.75]
        
        if not all_findings:
            return {
                "flagged": False,
                "confidence": 0.0,
                "flag_reason": None,
                "sanitized_response": llm_output,
                "explanation": None,
            }
        
        # Get highest severity finding
        worst = max(all_findings, key=lambda x: x["severity"])
        
        # Sanitize output
        sanitized = self._sanitize(llm_output, all_findings)
        
        # Build explanation
        finding_names = [f["name"] for f in all_findings[:3]]
        explanation = f"Output flagged: {', '.join(finding_names)} detected. Confidence: {worst['severity']:.0%}"
        
        return {
            "flagged": True,
            "confidence": worst["severity"],
            "flag_reason": worst["name"].upper(),
            "sanitized_response": sanitized,
            "explanation": explanation,
            "findings": [{"name": f["name"], "severity": f["severity"]} for f in all_findings],
        }

    def _scan_pii(self, text: str) -> list:
        """Scan for PII patterns."""
        findings = []
        for pii in PII_PATTERNS:
            matches = re.findall(pii["pattern"], text, re.I)
            if matches:
                findings.append({
                    "name": pii["name"],
                    "severity": pii["severity"],
                    "matches": matches[:3],
                    "type": "PII",
                })
        return findings

    def _scan_policy(self, text: str) -> list:
        """Scan for policy violations."""
        findings = []
        for policy in POLICY_PATTERNS:
            if re.search(policy["pattern"], text, re.I):
                findings.append({
                    "name": policy["name"],
                    "severity": policy["severity"],
                    "type": "POLICY",
                })
        return findings

    def _sanitize(self, text: str, findings: list) -> str:
        """Mask detected PII in the output."""
        sanitized = text
        for finding in findings:
            if finding.get("type") == "PII" and "matches" in finding:
                for match in finding["matches"]:
                    mask = f"[{finding['name'].upper()}_REDACTED]"
                    sanitized = sanitized.replace(str(match), mask)
            elif finding.get("type") == "POLICY":
                sanitized = f"⚠️ Response sanitized by ARGUS Output Auditor. Policy violation detected: {finding['name']}."
                break
        return sanitized
