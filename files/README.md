# ATLAS Receipt Intelligence Model

Complete ML pipeline for receipt detection, quality assessment, and type classification.

---

## Files

| File | Purpose |
|------|---------|
| `train.py` | Full training pipeline — run this first |
| `server.py` | FastAPI ONNX inference server |
| `custom-model.ts` | TypeScript client → drop in `lib/ai/` |
| `pipeline.ts` | Dual-model orchestrator → drop in `lib/ai/` |
| `crowdtag-stub.ts` | Phase 2 hook → drop in `lib/ai/` |

---

## Step 1 — Install Dependencies

```bash
pip install tensorflow tensorflowjs tf2onnx onnx onnxruntime \
            fastapi uvicorn python-multipart pillow numpy \
            matplotlib seaborn scikit-learn
```

---

## Step 2 — Prepare Dataset

Your dataset folder must look like this:

```
dataset/
  train/
    receipt/        ← or whatever your class folders are named
    non_receipt/
  validation/
    receipt/
    non_receipt/
  test/
    receipt/
    non_receipt/
```

Download from Kaggle:
```bash
pip install kaggle
kaggle datasets download -d paritkansal/billsreceipts
unzip billsreceipts.zip -d dataset/
```

---

## Step 3 — Train

```bash
# Standard run (recommended)
python train.py --dataset ./dataset --output ./models --epochs 30 --batch 32

# With custom fine-tuning
python train.py \
  --dataset ./dataset \
  --output ./models \
  --epochs 30 \
  --batch 32 \
  --lr 0.0001 \
  --fine_tune_at 100 \
  --fine_tune_epochs 10

# Skip exports you don't need
python train.py --dataset ./dataset --no_export_tflite
```

Training phases:
- **Phase 1** (~30 epochs): Only the classification head trains. MobileNetV2 is frozen.
- **Phase 2** (~10 epochs): Fine-tunes MobileNetV2 from layer 100 onwards at LR/10.

Expected outputs in `./models/`:
```
models/
  best_model_phase1.h5
  best_model_phase2.h5
  atlas_receipt_model.h5
  atlas_receipt_savedmodel/
  tfjs/
    model.json
    group1-shard*.bin
  atlas_receipt_model.tflite
  atlas_receipt_model.onnx
  class_labels.json
  model_metadata.json
  confusion_matrix.png
  confidence_histogram.png
  training_curves.png
  training_log_phase1.csv
  training_log_phase2.csv
```

---

## Step 4 — Run Inference Server

```bash
# Set environment variables
export MODEL_PATH=./models/atlas_receipt_model.onnx
export METADATA_PATH=./models/model_metadata.json
export CLASS_LABELS_PATH=./models/class_labels.json

# Start server
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

# Test it
curl -X POST http://localhost:8001/predict \
  -F "file=@/path/to/receipt.jpg"
```

API docs: http://localhost:8001/docs

---

## Step 5 — Integrate with ATLAS Next.js App

1. Copy `custom-model.ts` → `lib/ai/custom-model.ts`
2. Copy `pipeline.ts` → `lib/ai/pipeline.ts`
3. Copy `crowdtag-stub.ts` → `lib/ai/crowdtag-stub.ts`
4. Copy `tfjs/` folder → `public/models/atlas-receipt-v1/`
5. Add to `.env.local`:

```env
ATLAS_ML_SERVER_URL=http://localhost:8001
```

6. In production, deploy the FastAPI server separately (Railway, Render, or EC2)
   and set `ATLAS_ML_SERVER_URL` to its public URL.

---

## Step 6 — TF.js Browser Usage (Optional)

The `tfjs/` output can run directly in the browser:

```typescript
import * as tf from "@tensorflow/tfjs";

const model = await tf.loadLayersModel("/models/atlas-receipt-v1/model.json");
const imgTensor = tf.browser.fromPixels(imgElement)
  .resizeBilinear([224, 224])
  .div(255.0)
  .expandDims(0);

const prediction = model.predict(imgTensor) as tf.Tensor;
const confidence  = prediction.dataSync()[0];
```

---

## Confidence Tiers

| Score | Tier | UI Color | ATLAS Action |
|-------|------|----------|--------------|
| ≥ 0.85 | High | 🟢 Green | Auto-accept |
| 0.60–0.84 | Medium | 🟡 Amber | Show to user for confirmation |
| < 0.60 | Low | 🔴 Red | Reject — ask user to retake photo |

---

## Architecture

```
Receipt Image
     │
     ├──────────────────────────────┐
     ▼                              ▼
Gemini Vision API          Custom ML (ONNX)
(text extraction +         (receipt validation +
 line item categorization)  type classification)
     │                              │
     ▼                              ▼
confidence score           confidence score
     │                              │
     └──────────┬───────────────────┘
                ▼
        Pick higher confidence
                │
         ┌──────┴──────┐
         │             │
      ≥ 0.60        < 0.60
         │             │
    Use result    Ask user to
                  retake photo
         │
         ▼
  Log merchant vote (CrowdTag Phase 2 hook)
         │
         ▼
   Save to Supabase
         │
         ▼
   Return to user
```

---

## Docker (Production)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY models/ ./models/

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
```

```bash
docker build -t atlas-model-server .
docker run -p 8001:8001 \
  -e MODEL_PATH=/app/models/atlas_receipt_model.onnx \
  atlas-model-server
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Test Accuracy | > 92% | On balanced test set |
| AUC-ROC | > 0.96 | Per-class |
| Inference time | < 200ms | ONNX on CPU |
| Model size (ONNX) | < 15MB | MobileNetV2 compressed |
| Model size (TF.js) | < 20MB | Browser deployable |
| High confidence % | > 75% | % of real-world scans auto-accepted |


---

*ATLAS Engineering — Phase 2 ML Pipeline*
