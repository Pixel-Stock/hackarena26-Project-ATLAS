"""
ATLAS Receipt Model — FastAPI Inference Server
================================================
Wraps the trained ONNX model in a production-ready REST API.
This is the Python backend that Next.js /api/scan calls when
the ONNX model is selected as the inference backend.

Run locally:
  uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

Docker:
  docker build -t atlas-model-server .
  docker run -p 8001:8001 atlas-model-server

Environment variables:
  MODEL_PATH          Path to atlas_receipt_model.onnx
  METADATA_PATH       Path to model_metadata.json
  CLASS_LABELS_PATH   Path to class_labels.json
  MAX_FILE_SIZE_MB    Max upload size (default 10)
  LOG_LEVEL           INFO / DEBUG / WARNING
"""

import os
import io
import json
import time
import logging
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageOps

# ── FastAPI ────────────────────────────────────────────────────────────
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── ONNX Runtime ──────────────────────────────────────────────────────
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger("atlas.server")


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

MODEL_PATH        = Path(os.getenv("MODEL_PATH",        "./models/atlas_receipt_model.onnx"))
METADATA_PATH     = Path(os.getenv("METADATA_PATH",     "./models/model_metadata.json"))
CLASS_LABELS_PATH = Path(os.getenv("CLASS_LABELS_PATH", "./models/class_labels.json"))
MAX_FILE_SIZE_MB  = int(os.getenv("MAX_FILE_SIZE_MB",   "10"))
IMG_SIZE          = (224, 224)
ALLOWED_TYPES     = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


# ─────────────────────────────────────────────
# RESPONSE MODELS
# ─────────────────────────────────────────────

class PredictionResult(BaseModel):
    predicted_class:  str
    class_index:      int
    confidence:       float
    confidence_tier:  str           # "high" | "medium" | "low"
    all_probabilities: dict         # {class_name: probability}
    model_version:    str
    inference_time_ms: float
    action:           str           # "auto_accept" | "confirm" | "retake"


class HealthResponse(BaseModel):
    status:        str
    model_loaded:  bool
    model_version: str
    onnx_available: bool


# ─────────────────────────────────────────────
# MODEL LOADER
# ─────────────────────────────────────────────

class ATLASInferenceEngine:
    """Singleton ONNX inference engine. Loaded once at startup."""

    def __init__(self):
        self.session:      Optional[ort.InferenceSession] = None
        self.class_labels: dict = {}
        self.metadata:     dict = {}
        self.thresholds:   dict = {}
        self._load()

    def _load(self):
        if not ONNX_AVAILABLE:
            log.error("onnxruntime not installed. Run: pip install onnxruntime")
            return

        if not MODEL_PATH.exists():
            log.error(f"Model not found at {MODEL_PATH}. Run train.py first.")
            return

        # ONNX session with CPU + possible GPU
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        try:
            self.session = ort.InferenceSession(str(MODEL_PATH), providers=providers)
            log.info(f"✅ ONNX model loaded from {MODEL_PATH}")
            log.info(f"   Providers: {self.session.get_providers()}")
        except Exception as e:
            log.error(f"Failed to load ONNX model: {e}")
            return

        # Load class labels
        if CLASS_LABELS_PATH.exists():
            with open(CLASS_LABELS_PATH) as f:
                self.class_labels = json.load(f)  # {"0": "class_a", "1": "class_b"}
            log.info(f"✅ Class labels loaded: {self.class_labels}")

        # Load metadata + thresholds
        if METADATA_PATH.exists():
            with open(METADATA_PATH) as f:
                self.metadata = json.load(f)
            self.thresholds = self.metadata.get("thresholds", {
                "high_confidence":   0.85,
                "medium_confidence": 0.60,
                "reject_below":      0.60,
            })
            log.info(f"✅ Metadata loaded — model v{self.metadata.get('version', 'unknown')}")

    @property
    def is_ready(self) -> bool:
        return self.session is not None

    def preprocess(self, image_bytes: bytes) -> np.ndarray:
        """
        Preprocess image to match training pipeline:
        - Resize to 224x224
        - Normalize to [0, 1]
        - Add batch dimension
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = ImageOps.fit(img, IMG_SIZE, Image.LANCZOS)
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = np.expand_dims(arr, axis=0)  # (1, 224, 224, 3)
        return arr

    def predict(self, image_bytes: bytes) -> PredictionResult:
        if not self.is_ready:
            raise RuntimeError("Model not loaded")

        start = time.perf_counter()

        # Preprocess
        input_array = self.preprocess(image_bytes)

        # Inference
        input_name   = self.session.get_inputs()[0].name
        output_name  = self.session.get_outputs()[0].name
        raw_output   = self.session.run([output_name], {input_name: input_array})[0]

        elapsed_ms = (time.perf_counter() - start) * 1000

        # Parse output
        proba = raw_output[0]  # shape: (num_classes,) or (1,) for binary

        if len(proba) == 1:
            # Binary sigmoid output
            p_positive = float(proba[0])
            proba_list = [1 - p_positive, p_positive]
            class_idx  = int(p_positive > 0.5)
            confidence = p_positive if class_idx == 1 else (1 - p_positive)
        else:
            # Multi-class softmax
            proba_list = proba.tolist()
            class_idx  = int(np.argmax(proba))
            confidence = float(np.max(proba))

        class_name = self.class_labels.get(str(class_idx), f"class_{class_idx}")

        # Confidence tier + action
        high_t   = self.thresholds.get("high_confidence",   0.85)
        medium_t = self.thresholds.get("medium_confidence", 0.60)

        if confidence >= high_t:
            tier   = "high"
            action = "auto_accept"
        elif confidence >= medium_t:
            tier   = "medium"
            action = "confirm"
        else:
            tier   = "low"
            action = "retake"

        all_probs = {
            self.class_labels.get(str(i), f"class_{i}"): round(float(p), 6)
            for i, p in enumerate(proba_list)
        }

        return PredictionResult(
            predicted_class=class_name,
            class_index=class_idx,
            confidence=round(confidence, 6),
            confidence_tier=tier,
            all_probabilities=all_probs,
            model_version=self.metadata.get("version", "unknown"),
            inference_time_ms=round(elapsed_ms, 2),
            action=action,
        )


# Singleton
engine = ATLASInferenceEngine()


# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────

app = FastAPI(
    title="ATLAS Receipt Intelligence API",
    description="Receipt detection and classification model inference server",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # lock this down in production to your Next.js domain
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# MIDDLEWARE — Request logging
# ─────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    log.info(f"{request.method} {request.url.path} → {response.status_code} ({elapsed:.1f}ms)")
    return response


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if engine.is_ready else "degraded",
        model_loaded=engine.is_ready,
        model_version=engine.metadata.get("version", "unknown"),
        onnx_available=ONNX_AVAILABLE,
    )


@app.post("/predict", response_model=PredictionResult)
async def predict(file: UploadFile = File(...)):
    """
    POST /predict
    Accepts a receipt image, returns classification + confidence.
    
    This is called by ATLAS /api/scan as the custom ML model fallback.
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Use: {ALLOWED_TYPES}",
        )

    # Read and size-check
    image_bytes = await file.read()
    size_mb = len(image_bytes) / 1024 / 1024
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f}MB. Max: {MAX_FILE_SIZE_MB}MB",
        )

    if not engine.is_ready:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Check server logs.",
        )

    try:
        result = engine.predict(image_bytes)
        return result
    except Exception as e:
        log.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@app.get("/metadata")
async def get_metadata():
    """Returns full model metadata including class names, thresholds, training info."""
    if not engine.metadata:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return engine.metadata


@app.get("/classes")
async def get_classes():
    """Returns class index → class name mapping."""
    return engine.class_labels


# ─────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        workers=1,           # use 4+ in production
        log_level="info",
        reload=False,
    )
