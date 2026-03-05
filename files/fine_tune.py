"""
ATLAS Phase 2 — ML Fine-Tuning Script
=======================================
Loads the Phase 1 trained model (best_model_phase1.h5) and fine-tunes
with unfrozen MobileNetV2 layers, stronger augmentation, label smoothing,
and gradient clipping for improved receipt classification.

Key differences from Phase 1 train.py:
  - Unfreezes MobileNetV2 from layer 100+ (configurable)
  - LR: 1e-5 (10x lower than Phase 1)
  - BatchNorm layers ALWAYS stay frozen (prevents stat corruption)
  - Stronger augmentation: rotation ±25°, brightness 0.4–1.6
  - Label smoothing: 0.1 for better confidence calibration
  - Gradient clipping: clipnorm=1.0 for stability
  - Batch size: 16 (more VRAM per unfrozen layer)

Usage:
  python fine_tune.py --base_model ./models/best_model_phase1.h5 --dataset ./dataset --output ./models
  python fine_tune.py --base_model ./models/best_model_phase1.h5 --dataset ./dataset --output ./models --unfreeze_from 120 --epochs 10 --lr 0.000005 --batch 8

Author: ATLAS Engineering — Phase 2
"""

import os
import sys
import json
import argparse
import warnings
import logging
from pathlib import Path
from datetime import datetime
from typing import Tuple, Dict, List

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("atlas.finetune")

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    accuracy_score,
)
from sklearn.utils.class_weight import compute_class_weight

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────

IMG_SIZE = (224, 224)
CHANNELS = 3
INPUT_SHAPE = (*IMG_SIZE, CHANNELS)
SEED = 42
MODEL_VERSION = "2.0.0"

CONFIDENCE_HIGH   = 0.85
CONFIDENCE_MEDIUM = 0.60
CONFIDENCE_LOW    = 0.60

tf.random.set_seed(SEED)
np.random.seed(SEED)


# ─────────────────────────────────────────────
# ARGUMENT PARSER
# ─────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ATLAS Phase 2 — ML Fine-Tuning")
    parser.add_argument("--base_model",    type=str, default="./models/best_model_phase1.h5", help="Path to Phase 1 trained model (.h5)")
    parser.add_argument("--dataset",       type=str, default="./dataset",       help="Path to dataset root (train/validation/test)")
    parser.add_argument("--output",        type=str, default="./models",        help="Output directory for fine-tuned models")
    parser.add_argument("--unfreeze_from", type=int, default=100,               help="Unfreeze MobileNetV2 layers from this index")
    parser.add_argument("--epochs",        type=int, default=15,                help="Fine-tuning epochs")
    parser.add_argument("--lr",            type=float, default=1e-5,            help="Fine-tuning learning rate (10x lower than Phase 1)")
    parser.add_argument("--batch",         type=int, default=16,                help="Batch size (lower than Phase 1 due to unfrozen layers)")
    parser.add_argument("--label_smooth",  type=float, default=0.1,             help="Label smoothing factor")
    parser.add_argument("--no_export_tfjs",  action="store_true",               help="Skip TF.js export")
    parser.add_argument("--no_export_tflite", action="store_true",              help="Skip TFLite export")
    parser.add_argument("--no_export_onnx",  action="store_true",               help="Skip ONNX export")
    return parser.parse_args()


# ─────────────────────────────────────────────
# DATA PIPELINE (Phase 2 — Stronger Augmentation)
# ─────────────────────────────────────────────

def build_data_pipeline(dataset_dir: str, batch_size: int) -> Tuple:
    """
    Phase 2 augmentation is STRONGER than Phase 1:
    - Rotation: ±25° (was ±20°)
    - Brightness: 0.4–1.6 (was 0.5–1.5)
    - Channel shift: 40 (was 30)
    - Added width/height shift 0.15 (was 0.1)
    """
    dataset_path = Path(dataset_dir)

    for split in ["train", "validation", "test"]:
        if not (dataset_path / split).exists():
            raise FileNotFoundError(f"Missing '{split}' folder at {dataset_path / split}")

    class_names = sorted([
        d.name for d in (dataset_path / "train").iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ])
    num_classes = len(class_names)
    log.info(f"📁 Classes detected ({num_classes}): {class_names}")

    # Phase 2: Stronger augmentation
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=25,              # ±25° (Phase 1: ±20°)
        width_shift_range=0.15,         # 0.15 (Phase 1: 0.1)
        height_shift_range=0.15,
        shear_range=12,                 # 12° (Phase 1: 10°)
        zoom_range=0.2,                 # 0.2 (Phase 1: 0.15)
        brightness_range=[0.4, 1.6],    # wider (Phase 1: 0.5–1.5)
        channel_shift_range=40,         # 40 (Phase 1: 30)
        horizontal_flip=False,
        vertical_flip=False,
        fill_mode="nearest",
    )

    eval_datagen = ImageDataGenerator(rescale=1.0 / 255)

    flow_kwargs = dict(
        target_size=IMG_SIZE,
        batch_size=batch_size,
        class_mode="categorical" if num_classes > 2 else "binary",
        seed=SEED,
        interpolation="lanczos",
    )

    train_gen = train_datagen.flow_from_directory(
        str(dataset_path / "train"), shuffle=True, **flow_kwargs,
    )
    val_gen = eval_datagen.flow_from_directory(
        str(dataset_path / "validation"), shuffle=False, **flow_kwargs,
    )
    test_gen = eval_datagen.flow_from_directory(
        str(dataset_path / "test"), shuffle=False, **flow_kwargs,
    )

    # Class weights
    train_labels = train_gen.classes
    unique_classes = np.unique(train_labels)
    weights = compute_class_weight("balanced", classes=unique_classes, y=train_labels)
    class_weights = dict(zip(unique_classes, weights))
    log.info(f"⚖️  Class weights: {class_weights}")

    return train_gen, val_gen, test_gen, class_names, class_weights


# ─────────────────────────────────────────────
# FINE-TUNING LOGIC
# ─────────────────────────────────────────────

def prepare_for_fine_tuning(
    model: Model,
    unfreeze_from: int,
    lr: float,
    label_smoothing: float,
    num_classes: int,
) -> Model:
    """
    Unfreeze MobileNetV2 from layer `unfreeze_from` onwards.
    CRITICAL: BatchNorm layers MUST stay frozen to avoid stat corruption.
    """
    # Find the MobileNetV2 base model layer
    base_model = None
    for layer in model.layers:
        if hasattr(layer, 'layers') and len(layer.layers) > 50:
            base_model = layer
            break

    if base_model is None:
        log.error("❌ Could not find MobileNetV2 base model in loaded model")
        sys.exit(1)

    base_model.trainable = True
    frozen_count = 0
    unfrozen_count = 0
    bn_frozen = 0

    for i, layer in enumerate(base_model.layers):
        if i < unfreeze_from:
            layer.trainable = False
            frozen_count += 1
        elif isinstance(layer, layers.BatchNormalization):
            # CRITICAL: BatchNorm MUST stay frozen during fine-tuning
            layer.trainable = False
            bn_frozen += 1
        else:
            layer.trainable = True
            unfrozen_count += 1

    log.info(f"🔓 Fine-tuning setup:")
    log.info(f"   Total base layers:  {len(base_model.layers)}")
    log.info(f"   Frozen (< {unfreeze_from}):    {frozen_count}")
    log.info(f"   Unfrozen:           {unfrozen_count}")
    log.info(f"   BatchNorm (frozen): {bn_frozen}")

    # Count total trainable params
    trainable = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
    non_trainable = sum(tf.keras.backend.count_params(w) for w in model.non_trainable_weights)
    log.info(f"   Trainable params:     {trainable:,}")
    log.info(f"   Non-trainable params: {non_trainable:,}")

    # Recompile with lower LR + label smoothing + gradient clipping
    if num_classes == 2:
        loss = keras.losses.BinaryCrossentropy(label_smoothing=label_smoothing)
        metrics = ["accuracy", keras.metrics.AUC(name="auc")]
    else:
        loss = keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing)
        metrics = ["accuracy"]

    model.compile(
        optimizer=keras.optimizers.Adam(
            learning_rate=lr,
            clipnorm=1.0,   # Gradient clipping for stability
        ),
        loss=loss,
        metrics=metrics,
    )

    log.info(f"   LR:              {lr}")
    log.info(f"   Label smoothing: {label_smoothing}")
    log.info(f"   Gradient clip:   clipnorm=1.0")

    return model


def build_finetune_callbacks(output_dir: Path) -> List[callbacks.Callback]:
    """Callbacks for fine-tuning phase."""
    return [
        callbacks.ModelCheckpoint(
            filepath=str(output_dir / "best_model_finetuned.h5"),
            monitor="val_accuracy",
            save_best_only=True,
            save_weights_only=False,
            mode="max",
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True,
            mode="max",
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-8,
            verbose=1,
        ),
        callbacks.TensorBoard(
            log_dir=str(output_dir / "logs" / f"finetune_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
            histogram_freq=1,
            update_freq="epoch",
        ),
        callbacks.CSVLogger(
            str(output_dir / "training_log_finetune.csv"),
            append=False,
        ),
    ]


# ─────────────────────────────────────────────
# EVALUATION
# ─────────────────────────────────────────────

def evaluate_model(model: Model, test_gen, class_names: List[str], output_dir: Path) -> Dict:
    """Evaluate fine-tuned model on test set."""
    log.info("📊 Running evaluation on test set...")
    test_gen.reset()
    num_classes = len(class_names)

    y_pred_proba = model.predict(test_gen, verbose=1)
    y_true = test_gen.classes

    if num_classes == 2:
        y_pred = (y_pred_proba > 0.5).astype(int).flatten()
        y_pred_proba_flat = y_pred_proba.flatten()
        auc = roc_auc_score(y_true, y_pred_proba_flat)
    else:
        y_pred = np.argmax(y_pred_proba, axis=1)
        auc = roc_auc_score(
            tf.keras.utils.to_categorical(y_true, num_classes),
            y_pred_proba, multi_class="ovr", average="macro",
        )

    acc = accuracy_score(y_true, y_pred)
    log.info(f"   Test Accuracy : {acc:.4f} ({acc*100:.2f}%)")
    log.info(f"   AUC-ROC       : {auc:.4f}")

    report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
    log.info("\n" + classification_report(y_true, y_pred, target_names=class_names))

    # Confidence distribution
    if num_classes > 2:
        confidences = np.max(y_pred_proba, axis=1)
    else:
        confidences = np.abs(y_pred_proba.flatten() - 0.5) * 2

    high_conf   = float(np.mean(confidences >= CONFIDENCE_HIGH))
    medium_conf = float(np.mean((confidences >= CONFIDENCE_MEDIUM) & (confidences < CONFIDENCE_HIGH)))
    low_conf    = float(np.mean(confidences < CONFIDENCE_MEDIUM))

    log.info(f"\n   Confidence Distribution:")
    log.info(f"   High   (≥{CONFIDENCE_HIGH}):  {high_conf*100:.1f}%")
    log.info(f"   Medium ({CONFIDENCE_MEDIUM}–{CONFIDENCE_HIGH}): {medium_conf*100:.1f}%")
    log.info(f"   Low    (<{CONFIDENCE_MEDIUM}): {low_conf*100:.1f}%")

    # Plot confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(max(8, num_classes * 1.5), max(6, num_classes * 1.2)))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names, ax=ax)
    ax.set_ylabel("True Label", fontsize=12)
    ax.set_xlabel("Predicted Label", fontsize=12)
    ax.set_title("ATLAS Phase 2 — Fine-Tuned Confusion Matrix", fontsize=14, pad=15)
    plt.tight_layout()
    plt.savefig(output_dir / "confusion_matrix_finetuned.png", dpi=150)
    plt.close()
    log.info(f"   📊 Confusion matrix saved → {output_dir / 'confusion_matrix_finetuned.png'}")

    # Plot confidence histogram
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.hist(confidences, bins=50, color="#10b981", edgecolor="white", alpha=0.85)
    ax.axvline(CONFIDENCE_HIGH, color="#f59e0b", linestyle="--", linewidth=2, label=f"High ({CONFIDENCE_HIGH})")
    ax.axvline(CONFIDENCE_MEDIUM, color="#ef4444", linestyle="--", linewidth=2, label=f"Medium ({CONFIDENCE_MEDIUM})")
    ax.set_xlabel("Confidence Score", fontsize=12)
    ax.set_ylabel("Count", fontsize=12)
    ax.set_title("ATLAS Phase 2 — Fine-Tuned Confidence Distribution", fontsize=14)
    ax.legend()
    ax.set_facecolor("#0d0d0d")
    fig.patch.set_facecolor("#1a1a1a")
    ax.tick_params(colors="white")
    ax.xaxis.label.set_color("white"); ax.yaxis.label.set_color("white"); ax.title.set_color("white")
    plt.tight_layout()
    plt.savefig(output_dir / "confidence_histogram_finetuned.png", dpi=150, facecolor=fig.get_facecolor())
    plt.close()
    log.info(f"   📊 Confidence histogram saved → {output_dir / 'confidence_histogram_finetuned.png'}")

    # Plot training curves from CSV
    csv_path = output_dir / "training_log_finetune.csv"
    if csv_path.exists():
        import csv
        rows = []
        with open(csv_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append({k: float(v) for k, v in row.items()})

        if rows:
            epochs_list = [r["epoch"] for r in rows]
            train_acc = [r["accuracy"] for r in rows]
            val_acc   = [r.get("val_accuracy", 0) for r in rows]
            train_los = [r["loss"] for r in rows]
            val_los   = [r.get("val_loss", 0) for r in rows]

            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
            ax1.plot(epochs_list, train_acc, label="Train Acc", color="#10b981")
            ax1.plot(epochs_list, val_acc, label="Val Acc", color="#6b5dd3")
            ax1.set_title("Fine-Tune Accuracy"); ax1.legend(); ax1.set_xlabel("Epoch")

            ax2.plot(epochs_list, train_los, label="Train Loss", color="#10b981")
            ax2.plot(epochs_list, val_los, label="Val Loss", color="#6b5dd3")
            ax2.set_title("Fine-Tune Loss"); ax2.legend(); ax2.set_xlabel("Epoch")

            plt.suptitle("ATLAS Phase 2 — Fine-Tuning Curves", fontsize=14)
            plt.tight_layout()
            plt.savefig(output_dir / "training_curves_finetuned.png", dpi=150)
            plt.close()
            log.info(f"   📊 Training curves saved → {output_dir / 'training_curves_finetuned.png'}")

    return {
        "test_accuracy": float(acc),
        "auc_roc": float(auc),
        "confidence_high_pct": high_conf,
        "confidence_medium_pct": medium_conf,
        "confidence_low_pct": low_conf,
        "classification_report": report,
    }


# ─────────────────────────────────────────────
# MODEL EXPORT
# ─────────────────────────────────────────────

def export_all(model: Model, output_dir: Path, args: argparse.Namespace):
    """Export fine-tuned model in all deployment formats."""
    log.info("\n📦 Exporting fine-tuned model...")

    # Keras .h5
    h5_path = output_dir / "atlas_receipt_model_finetuned.h5"
    model.save(str(h5_path))
    log.info(f"✅ Keras .h5 → {h5_path}")

    # SavedModel
    sm_path = output_dir / "atlas_receipt_savedmodel_finetuned"
    model.export(str(sm_path))
    log.info(f"✅ SavedModel → {sm_path}")

    # TF.js
    if not args.no_export_tfjs:
        try:
            import tensorflowjs as tfjs
            tfjs_path = output_dir / "tfjs_finetuned"
            tfjs_path.mkdir(exist_ok=True)
            tfjs.converters.convert_tf_saved_model(str(sm_path), str(tfjs_path))
            log.info(f"✅ TF.js → {tfjs_path}")
        except ImportError:
            log.warning("⚠️  tensorflowjs not installed — skipping TF.js export")
        except Exception as e:
            log.error(f"❌ TF.js export failed: {e}")

    # TFLite
    if not args.no_export_tflite:
        try:
            converter = tf.lite.TFLiteConverter.from_saved_model(str(sm_path))
            converter.optimizations = [tf.lite.Optimize.DEFAULT]
            tflite_model = converter.convert()
            tflite_path = output_dir / "atlas_receipt_model_finetuned.tflite"
            tflite_path.write_bytes(tflite_model)
            size_mb = tflite_path.stat().st_size / 1024 / 1024
            log.info(f"✅ TFLite → {tflite_path}  ({size_mb:.2f} MB)")
        except Exception as e:
            log.error(f"❌ TFLite export failed: {e}")

    # ONNX
    if not args.no_export_onnx:
        try:
            import subprocess
            onnx_path = output_dir / "atlas_receipt_model_finetuned.onnx"
            result = subprocess.run(
                [sys.executable, "-m", "tf2onnx.convert",
                 "--saved-model", str(sm_path),
                 "--output", str(onnx_path),
                 "--opset", "17"],
                capture_output=True, text=True,
            )
            if result.returncode == 0:
                size_mb = onnx_path.stat().st_size / 1024 / 1024
                log.info(f"✅ ONNX → {onnx_path}  ({size_mb:.2f} MB)")
            else:
                log.error(f"❌ ONNX export failed:\n{result.stderr}")
        except Exception as e:
            log.error(f"❌ ONNX export failed: {e}")


def save_metadata(output_dir: Path, class_names: List[str], metrics: Dict, args: argparse.Namespace):
    """Update model_metadata.json with fine-tune stats."""
    # Load existing metadata if present
    meta_path = output_dir / "model_metadata.json"
    if meta_path.exists():
        with open(meta_path) as f:
            metadata = json.load(f)
    else:
        metadata = {}

    metadata.update({
        "model_name": "atlas_receipt_model_finetuned",
        "version": MODEL_VERSION,
        "fine_tuned_at": datetime.now().isoformat(),
        "fine_tuning": {
            "base_model": args.base_model,
            "unfreeze_from": args.unfreeze_from,
            "epochs": args.epochs,
            "learning_rate": args.lr,
            "batch_size": args.batch,
            "label_smoothing": args.label_smooth,
            "gradient_clipping": "clipnorm=1.0",
            "batchnorm_frozen": True,
            "augmentation": [
                "rotation_range=25 (stronger tilt)",
                "brightness_range=[0.4, 1.6] (wider range)",
                "channel_shift_range=40 (stronger contrast)",
                "shear_range=12",
                "zoom_range=0.2",
            ],
        },
        "performance": {
            "test_accuracy": metrics.get("test_accuracy"),
            "auc_roc": metrics.get("auc_roc"),
            "confidence_distribution": {
                "high_pct": metrics.get("confidence_high_pct"),
                "medium_pct": metrics.get("confidence_medium_pct"),
                "low_pct": metrics.get("confidence_low_pct"),
            },
        },
    })

    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    log.info(f"✅ Metadata updated → {meta_path}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    args = parse_args()
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    log.info("=" * 60)
    log.info("  ATLAS Phase 2 — ML Fine-Tuning")
    log.info(f"  Base model   : {args.base_model}")
    log.info(f"  Dataset      : {args.dataset}")
    log.info(f"  Output       : {args.output}")
    log.info(f"  Unfreeze from: layer {args.unfreeze_from}")
    log.info(f"  Epochs       : {args.epochs}")
    log.info(f"  Batch        : {args.batch}")
    log.info(f"  LR           : {args.lr}")
    log.info(f"  Label smooth : {args.label_smooth}")
    log.info(f"  GPU          : {tf.config.list_physical_devices('GPU')}")
    log.info("=" * 60)

    # ── 1. Verify base model exists ───────────────────────────────────
    base_path = Path(args.base_model)
    if not base_path.exists():
        log.error(f"❌ Base model not found: {base_path}")
        log.error("   Run Phase 1 training first: python train.py --dataset ./dataset")
        sys.exit(1)

    # ── 2. Load base model ────────────────────────────────────────────
    log.info(f"\n📥 Loading Phase 1 model: {base_path}")
    model = keras.models.load_model(str(base_path))
    log.info(f"   ✅ Loaded — {model.count_params():,} total parameters")

    # ── 3. Build data pipeline ────────────────────────────────────────
    log.info("\n📁 Building Phase 2 data pipeline (stronger augmentation)...")
    train_gen, val_gen, test_gen, class_names, class_weights = build_data_pipeline(
        args.dataset, args.batch,
    )
    num_classes = len(class_names)

    # ── 4. Prepare for fine-tuning ────────────────────────────────────
    log.info(f"\n🔓 Preparing model for fine-tuning (from layer {args.unfreeze_from})...")
    model = prepare_for_fine_tuning(
        model=model,
        unfreeze_from=args.unfreeze_from,
        lr=args.lr,
        label_smoothing=args.label_smooth,
        num_classes=num_classes,
    )

    # ── 5. Fine-tune ──────────────────────────────────────────────────
    log.info(f"\n🚀 Starting fine-tuning for {args.epochs} epochs...")
    model.fit(
        train_gen,
        epochs=args.epochs,
        validation_data=val_gen,
        class_weight=class_weights,
        callbacks=build_finetune_callbacks(output_dir),
        verbose=1,
    )

    # Load best checkpoint
    best_path = output_dir / "best_model_finetuned.h5"
    if best_path.exists():
        log.info(f"   Loading best checkpoint: {best_path}")
        model = keras.models.load_model(str(best_path))

    # ── 6. Evaluate ───────────────────────────────────────────────────
    metrics = evaluate_model(model, test_gen, class_names, output_dir)

    # ── 7. Export ─────────────────────────────────────────────────────
    export_all(model, output_dir, args)

    # ── 8. Metadata ──────────────────────────────────────────────────
    save_metadata(output_dir, class_names, metrics, args)

    log.info("\n" + "=" * 60)
    log.info("  ✅ ATLAS PHASE 2 FINE-TUNING COMPLETE")
    log.info(f"  Test Accuracy : {metrics['test_accuracy']*100:.2f}%")
    log.info(f"  AUC-ROC       : {metrics['auc_roc']:.4f}")
    log.info(f"  High Conf %   : {metrics['confidence_high_pct']*100:.1f}%")
    log.info(f"  All outputs   : {output_dir}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
