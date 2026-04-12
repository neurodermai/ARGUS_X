"""
ARGUS-X — Logging Utility
Structured logging with color-coded output for security events.
"""
import logging
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
        
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    return logger
