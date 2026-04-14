"""
ARGUS-X — Logging Utility
Structured logging with color-coded output for security events.
SECURITY: Secrets are scrubbed from all log output via SecretFilter.
"""
import logging
import re
import sys
import os

# Color codes for terminal
COLORS = {
    "DEBUG":    "\033[36m",   # Cyan
    "INFO":     "\033[32m",   # Green
    "WARNING":  "\033[33m",   # Yellow
    "ERROR":    "\033[31m",   # Red
    "CRITICAL": "\033[35m",   # Magenta
    "RESET":    "\033[0m",
}


class SecretFilter(logging.Filter):
    """SECURITY: Scrub known secret patterns from all log output.
    Prevents API keys, tokens, and Supabase keys from leaking into logs."""

    # Patterns that look like secrets (base64 tokens, API keys, etc.)
    _PATTERNS = [
        # Supabase keys (eyJ... JWT format)
        re.compile(r'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+'),
        # Generic long hex/base64 tokens (32+ chars)
        re.compile(r'(?:key|token|secret|password|api_key|apikey)\s*[=:]\s*["\']?([A-Za-z0-9_\-]{32,})', re.I),
    ]
    _REDACTED = "[REDACTED]"

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pat in self._PATTERNS:
                record.msg = pat.sub(self._REDACTED, record.msg)
        # Also scrub args if present
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: pat.sub(self._REDACTED, str(v)) if isinstance(v, str) else v
                    for k, v in record.args.items()
                    for pat in self._PATTERNS
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    self._PATTERNS[0].sub(self._REDACTED, str(a)) if isinstance(a, str) else a
                    for a in record.args
                )
        return True


class ArgusFormatter(logging.Formatter):
    """Custom formatter with colors and ARGUS prefix."""
    
    def format(self, record):
        color = COLORS.get(record.levelname, COLORS["RESET"])
        reset = COLORS["RESET"]
        record.levelname = f"{color}{record.levelname}{reset}"
        record.name = f"\033[36m{record.name}{reset}"
        return super().format(record)

def setup_logger(name: str = "argus", level: str = None) -> logging.Logger:
    """Create a configured logger for ARGUS modules."""
    log_level = level or os.getenv("LOG_LEVEL", "INFO")
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
        
        fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        handler.setFormatter(ArgusFormatter(fmt, datefmt="%H:%M:%S"))
        # SECURITY: Add secret filter to prevent key leakage
        handler.addFilter(SecretFilter())
        
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    return logger

