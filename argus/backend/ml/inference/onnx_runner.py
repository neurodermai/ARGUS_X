"""
ARGUS-X — ONNX Inference Runner
Fast wrapper for ONNX Runtime inference. CPU-only, no GPU required.
"""
import logging
import numpy as np
from typing import Optional, Dict, Any

log = logging.getLogger("argus.onnx_runner")


class ONNXRunner:
    """
    Lightweight ONNX inference wrapper.
    Handles tokenization → inference → softmax → classification.
    """

    def __init__(self, session=None, tokenizer=None):
        self.session = session
        self.tokenizer = tokenizer
        self.ready = session is not None and tokenizer is not None

    def predict(self, text: str, max_length: int = 256) -> Dict[str, Any]:
        """
        Run inference on a text input.
        Returns: {label: str, confidence: float, probabilities: list}
        """
        if not self.ready:
            return {"label": "UNKNOWN", "confidence": 0.0, "probabilities": []}

        try:
            # Tokenize
            inputs = self.tokenizer(
                text,
                return_tensors="np",
                truncation=True,
                max_length=max_length,
                padding="max_length",
            )

            # Prepare ONNX inputs
            ort_inputs = {
                "input_ids": inputs["input_ids"].astype(np.int64),
                "attention_mask": inputs["attention_mask"].astype(np.int64),
            }

            # Run inference
            outputs = self.session.run(None, ort_inputs)
            logits = outputs[0][0]

            # Softmax
            probs = self._softmax(logits)
            
            # Binary classification: [CLEAN, INJECTION]
            label = "INJECTION" if probs[1] > probs[0] else "CLEAN"
            confidence = float(max(probs))

            return {
                "label": label,
                "confidence": confidence,
                "probabilities": probs.tolist(),
                "injection_score": float(probs[1]) if len(probs) > 1 else 0.0,
            }

        except Exception as e:
            log.error(f"ONNX inference error: {e}")
            return {"label": "ERROR", "confidence": 0.0, "probabilities": []}

    def _softmax(self, logits):
        """Compute softmax probabilities."""
        exp_logits = np.exp(logits - np.max(logits))
        return exp_logits / exp_logits.sum()

    def benchmark(self, text: str, iterations: int = 100) -> Dict[str, float]:
        """Benchmark inference latency."""
        import time
        times = []
        for _ in range(iterations):
            t0 = time.perf_counter()
            self.predict(text)
            times.append((time.perf_counter() - t0) * 1000)
        
        return {
            "avg_ms": round(sum(times) / len(times), 2),
            "p50_ms": round(sorted(times)[len(times)//2], 2),
            "p99_ms": round(sorted(times)[int(len(times)*0.99)], 2),
            "min_ms": round(min(times), 2),
            "max_ms": round(max(times), 2),
        }
