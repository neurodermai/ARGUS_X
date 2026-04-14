"""
ARGUS-X — Blue Agent (Autonomous Defender)
The defensive counterpart to the Red Agent.
Responds to attacks, spawns mutations, patches bypasses.
"""
import logging
from typing import Dict, Any, Optional

log = logging.getLogger("argus.blue_agent")


class BlueAgent:
    """
    Autonomous defender that:
    1. Processes incoming attacks through the full pipeline
    2. Spawns mutation engine on blocks
    3. Auto-patches bypasses discovered by red agent
    4. Reports defense metrics
    """

    def __init__(self, firewall, mutator, fingerprinter, db=None):
        self.firewall = firewall
        self.mutator = mutator
        self.fingerprinter = fingerprinter
        self.db = db
        self.blocks = 0
        self.bypasses = 0
        self.auto_patches = 0
        self.mutations_spawned = 0
        log.info("✅ Blue Agent initialized")

    async def defend(self, attack_text: str, threat_type: str) -> Dict[str, Any]:
        """
        Process an attack through the defense pipeline.
        Returns defense result with metrics.
        """
        # Run firewall
        fw_result = await self.firewall.analyze(attack_text)
        
        result = {
            "blocked": fw_result["blocked"],
            "score": fw_result.get("score", 0),
            "method": fw_result.get("method", ""),
        }

        if fw_result["blocked"]:
            self.blocks += 1
            
            # Fingerprint the attack
            fp = await self.fingerprinter.fingerprint(attack_text, threat_type)
            result["sophistication"] = fp.get("sophistication_score", 0)
            result["fingerprint"] = fp.get("fingerprint_id", "")
            
            # Spawn mutations to pre-block variants
            mutations = await self.mutator.preblock_variants(
                attack_text, threat_type, self.firewall
            )
            self.mutations_spawned += mutations
            result["mutations"] = mutations
        else:
            self.bypasses += 1
            
            # Auto-patch: add bypassed attack to dynamic rules
            self.firewall.add_dynamic_rule(attack_text, threat_type)
            self.auto_patches += 1
            # Persist to DB so the rule survives restarts
            if self.db:
                await self.db.add_dynamic_rule(attack_text, threat_type, source="BLUE_AGENT_PATCH")
            result["auto_patched"] = True
            
            log.warning(f"🔧 Blue Agent auto-patched bypass: {threat_type}")

        return result

    def status(self) -> Dict[str, Any]:
        total = self.blocks + self.bypasses
        return {
            "blocks": self.blocks,
            "bypasses": self.bypasses,
            "auto_patches": self.auto_patches,
            "mutations_spawned": self.mutations_spawned,
            "defense_rate": round(self.blocks / max(total, 1) * 100, 1),
        }
