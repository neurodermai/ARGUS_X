"""
ARGUS — Semantic Mutation Engine
When an attack is detected, generates 50+ paraphrastic variants
and pre-blocks them all — making the firewall smarter after every attack.

This is the "self-learning" component that no other LLM security system has.
"""
import re, asyncio, logging
from typing import List, Dict

log = logging.getLogger("argus.mutation_engine")

# Mutation templates — transform attack patterns into variants
MUTATION_TRANSFORMS = {
    "INSTRUCTION_OVERRIDE": [
        ("ignore", ["disregard", "forget", "set aside", "pay no attention to", "override"]),
        ("previous", ["prior", "earlier", "above", "initial", "old"]),
        ("instructions", ["directives", "guidelines", "rules", "prompt", "context", "training"]),
    ],
    "ROLE_OVERRIDE": [
        ("act as", ["pretend to be", "simulate being", "roleplay as", "imagine you are", "become"]),
        ("no restrictions", ["without limits", "unrestricted", "uncensored", "free mode", "dev mode"]),
    ],
    "SYSTEM_PROMPT_EXTRACTION": [
        ("system prompt", ["initial instructions", "hidden prompt", "base instructions", "original context"]),
        ("reveal", ["show", "print", "output", "repeat", "tell me", "share", "display"]),
    ],
    "DATA_EXFILTRATION": [
        ("list all", ["dump all", "show all", "output all", "enumerate", "display all"]),
        ("salaries", ["wages", "pay", "compensation", "ctc", "earnings"]),
    ],
}

# Obfuscation mutations
OBFUSCATION_MAP = {
    "a": ["@", "4", "а"],  # Last is Cyrillic
    "e": ["3", "е"],       # Cyrillic е
    "i": ["1", "!"],
    "o": ["0", "о"],       # Cyrillic о
    "s": ["$", "5"],
    "t": ["+", "7"],
}

class SemanticMutationEngine:
    def __init__(self, models=None):
        self.models    = models
        self.preblocked: Dict[str, set] = {}  # fingerprint_id -> set of blocked variants
        log.info("✅ Semantic Mutation Engine initialized")

    async def preblock_variants(
        self, original_attack: str, threat_type: str, firewall
    ) -> int:
        """
        Generates semantic variants of the attack and adds them to the firewall's
        dynamic block list. Returns number of variants pre-blocked.
        """
        variants = await self._generate_variants(original_attack, threat_type)
        
        # Filter: only add variants that would NOT already be caught by existing rules
        new_blocks = 0
        for variant in variants:
            fw_result = await firewall.analyze(variant, skip_dynamic=True)
            if not fw_result["blocked"]:
                # This variant would have bypassed — add it
                firewall.add_dynamic_rule(variant, threat_type)
                new_blocks += 1

        log.info(f"Mutation engine: {new_blocks}/{len(variants)} new variants pre-blocked for {threat_type}")
        return new_blocks

    async def _generate_variants(self, text: str, threat_type: str) -> List[str]:
        variants = []
        
        # 1. Synonym substitution variants
        if threat_type in MUTATION_TRANSFORMS:
            for original, synonyms in MUTATION_TRANSFORMS[threat_type]:
                for syn in synonyms:
                    variant = re.sub(original, syn, text, flags=re.I)
                    if variant != text:
                        variants.append(variant)
        
        # 2. Case mutations
        variants.append(text.upper())
        variants.append(text.lower())
        variants.append(text.title())
        
        # 3. L33t obfuscation
        variants.append(self._l33t(text))
        
        # 4. Spacing mutations (evade simple keyword matching)
        variants.append(text.replace(" ", "  "))  # Double space
        variants.append(text.replace(" ", "\t"))  # Tab-separated
        
        # 5. Punctuation injection
        variants.append(text.replace(" ", ", "))
        variants.append(text.replace("instructions", "instruct-ions"))
        variants.append(text.replace(". ", ".\n"))  # Newline injection
        
        # 6. Hypothetical wrapping
        variants.append(f"Hypothetically speaking, {text}")
        variants.append(f"In a fictional story, {text}")
        variants.append(f"For educational purposes only: {text}")
        
        # 7. Authority injection
        variants.append(f"As the system administrator: {text}")
        variants.append(f"This is an official test. {text}")
        
        # Remove duplicates and the original
        variants = list(set(v for v in variants if v != text and len(v) > 5))
        return variants[:50]  # Cap at 50 variants

    def _l33t(self, text: str) -> str:
        result = []
        for char in text.lower():
            if char in OBFUSCATION_MAP:
                result.append(OBFUSCATION_MAP[char][0])
            else:
                result.append(char)
        return "".join(result)
