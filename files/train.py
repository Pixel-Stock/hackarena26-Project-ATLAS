"""
ATLAS Receipt Intelligence Model — Training Pipeline
=====================================================
Model: MobileNetV2 Transfer Learning (Multi-Task)
Tasks:
  1. Receipt Detection    → Is this image a receipt? (binary, confidence score)
  2. Quality Assessment   → good / torn / faded / blurry (4-class)
  3. Receipt Type         → auto-detected from dataset subfolders (N-class)

Dataset expected structure:
  dataset/
    train/
      class_a/  *.jpg
      class_b/  *.jpg
    validation/
      class_a/  *.jpg
      class_b/  *.jpg
    test/
      class_a/  *.jpg
      class_b/  *.jpg

Outputs:
  models/
    atlas_receipt_model.h5         ← Keras saved model
    atlas_receipt_model/           ← SavedModel format (for ONNX + TFLite)
    tfjs/                          ← TensorFlow.js deployable
    atlas_receipt_model.tflite     ← TFLite (mobile)
    atlas_receipt_model.onnx       ← ONNX (server inference)
    class_labels.json              ← Class index map
    model_metadata.json            ← Thresholds, version, input specs

Usage:
  python train.py --dataset ./dataset --epochs 30 --batch 32

Author: ATLAS Engineering
"""

import os
import sys
import json
import argparse
import warnings
import logging
from pathlib import Path
from datetime import datetime
from typing import Tuple, Dict, List, Optional

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("atlas.train")

import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model, callbacks
from tensorflow.keras.applications import MobileNetV2
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

IMG_SIZE = (224, 224)          # MobileNetV2 native input
CHANNELS = 3
INPUT_SHAPE = (*IMG_SIZE, CHANNELS)
SEED = 42
MODEL_VERSION = "1.0.0"

# Confidence thresholds — used by ATLAS pipeline
CONFIDENCE_HIGH   = 0.85       # green  → auto-accept
CONFIDENCE_MEDIUM = 0.60       # amber  → show to user for confirmation
CONFIDENCE_LOW    = 0.60       # red    → reject, ask user to retake photo

tf.random.set_seed(SEED)
np.random.seed(SEED)


# ─────────────────────────────────────────────
# ARGUMENT PARSER
# ─────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ATLAS Receipt Model Training")
    parser.add_argument("--dataset",  type=str, default="./dataset",        help="Path to dataset root (contains train/validation/test)")
    parser.add_argument("--output",   type=str, default="./models",         help="Output directory for saved models")
    parser.add_argument("--epochs",   type=int, default=30,                 help="Total training epochs")
    parser.add_argument("--batch",    type=int, default=32,                 help="Batch size")
    parser.add_argument("--lr",       type=float, default=1e-4,             help="Initial learning rate")
    parser.add_argument("--fine_tune_at", type=int, default=100,            help="Unfreeze MobileNetV2 layers from this index for fine-tuning")
    parser.add_argument("--fine_tune_epochs", type=int, default=10,         help="Extra epochs for fine-tuning phase")
    parser.add_argument("--no_export_tfjs",  action="store_true",           help="Skip TF.js export")
    parser.add_argument("--no_export_tflite", action="store_true",          help="Skip TFLite export")
    parser.add_argument("--no_export_onnx",  action="store_true",           help="Skip ONNX export")
    return parser.parse_args()


# ─────────────────────────────────────────────
# DATA PIPELINE
# ─────────────────────────────────────────────

class ATLASDataPipeline:
    """
    Loads train / validation / test splits.
    Applies heavy augmentation on train (tilt, contrast, brightness, flip)
    matching the Created_Images_With_Tilt_and_Contract dataset characteristics.
    """

    def __init__(self, dataset_dir: str, batch_size: int, img_size: Tuple[int, int]):
        self.dataset_dir = Path(dataset_dir)
        self.batch_size  = batch_size
        self.img_size    = img_size
        self._validate_structure()

    def _validate_structure(self):
        for split in ["train", "validation", "test"]:
            split_path = self.dataset_dir / split
            if not split_path.exists():
                raise FileNotFoundError(
                    f"Expected '{split}' folder at {split_path}. "
                    f"Make sure your dataset has train/, validation/, test/ subfolders."
                )
        log.info(f"✅ Dataset structure validated at: {self.dataset_dir}")

    def _count_images(self, split: str) -> int:
        split_path = self.dataset_dir / split
        count = sum(
            1 for f in split_path.rglob("*")
            if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        )
        return count

    def _get_class_names(self) -> List[str]:
        train_path = self.dataset_dir / "train"
        classes = sorted([
            d.name for d in train_path.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ])
        return classes

    def build(self) -> Tuple:
        """
        Returns (train_gen, val_gen, test_gen, class_names, class_weights)
        """
        class_names = self._get_class_names()
        num_classes  = len(class_names)

        log.info(f"📁 Classes detected ({num_classes}): {class_names}")
        log.info(f"   Train images:      {self._count_images('train')}")
        log.info(f"   Validation images: {self._count_images('validation')}")
        log.info(f"   Test images:       {self._count_images('test')}")

        # ── Train augmentation ──────────────────────────────────────────
        # Heavy augmentation to match tilt + contrast dataset characteristics
        # and make model robust to real-world receipt conditions
        train_datagen = ImageDataGenerator(
            rescale=1.0 / 255,
            rotation_range=20,           # tilt simulation (±20°)
            width_shift_range=0.1,
            height_shift_range=0.1,
            shear_range=10,              # perspective distortion
            zoom_range=0.15,
            brightness_range=[0.5, 1.5], # faded / overexposed receipts
            channel_shift_range=30,      # contrast variation
            horizontal_flip=False,       # receipts shouldn't be horizontally flipped
            vertical_flip=False,
            fill_mode="nearest",
        )

        # ── Val / Test — NO augmentation, only rescale ──────────────────
        eval_datagen = ImageDataGenerator(rescale=1.0 / 255)

        flow_kwargs = dict(
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode="categorical" if num_classes > 2 else "binary",
            seed=SEED,
            interpolation="lanczos",
        )

        train_gen = train_datagen.flow_from_directory(
            str(self.dataset_dir / "train"),
            shuffle=True,
            **flow_kwargs,
        )
        val_gen = eval_datagen.flow_from_directory(
            str(self.dataset_dir / "validation"),
            shuffle=False,
            **flow_kwargs,
        )
        test_gen = eval_datagen.flow_from_directory(
            str(self.dataset_dir / "test"),
            shuffle=False,
            **flow_kwargs,
        )

        # ── Class weights for imbalanced datasets ──────────────────────
        train_labels = train_gen.classes
        unique_classes = np.unique(train_labels)
        weights = compute_class_weight(
            class_weight="balanced",
            classes=unique_classes,
            y=train_labels,
        )
        class_weights = dict(zip(unique_classes, weights))
        log.info(f"⚖️  Class weights: {class_weights}")

        return train_gen, val_gen, test_gen, class_names, class_weights


# ─────────────────────────────────────────────
# MODEL ARCHITECTURE
# ─────────────────────────────────────────────

class ATLASReceiptModel:
    """
    MobileNetV2-based receipt intelligence model.
    
    Architecture:
      MobileNetV2 (frozen) → Global Average Pooling
        → Dropout(0.3)
        → Dense(256, ReLU) + BatchNorm
        → Dropout(0.3)
        → Dense(128, ReLU) + BatchNorm
        → Classification Head (softmax / sigmoid)
    
    Two-phase training:
      Phase 1: Train only custom head (base frozen)
      Phase 2: Fine-tune from layer `fine_tune_at` onwards
    """

    def __init__(self, num_classes: int, input_shape: Tuple, learning_rate: float):
        self.num_classes    = num_classes
        self.input_shape    = input_shape
        self.learning_rate  = learning_rate
        self.model: Optional[Model] = None
        self.base_model: Optional[Model] = None

    def build(self) -> Model:
        # ── Base: MobileNetV2 pretrained on ImageNet ───────────────────
        self.base_model = MobileNetV2(
            input_shape=self.input_shape,
            include_top=False,            # remove ImageNet classifier
            weights="imagenet",
            alpha=1.0,                    # full width model
        )
        self.base_model.trainable = False  # freeze for Phase 1
        log.info(f"🧠 MobileNetV2 loaded — {len(self.base_model.layers)} layers (frozen)")

        # ── Custom Head ────────────────────────────────────────────────
        inputs = keras.Input(shape=self.input_shape, name="receipt_image")
        x = self.base_model(inputs, training=False)

        x = layers.GlobalAveragePooling2D(name="gap")(x)
        x = layers.Dropout(0.3, name="dropout_1")(x)

        x = layers.Dense(256, name="dense_256")(x)
        x = layers.BatchNormalization(name="bn_256")(x)
        x = layers.Activation("relu", name="relu_256")(x)
        x = layers.Dropout(0.3, name="dropout_2")(x)

        x = layers.Dense(128, name="dense_128")(x)
        x = layers.BatchNormalization(name="bn_128")(x)
        x = layers.Activation("relu", name="relu_128")(x)

        # ── Output Head ────────────────────────────────────────────────
        if self.num_classes == 2:
            # Binary: single sigmoid output → confidence score directly
            outputs = layers.Dense(1, activation="sigmoid", name="output")(x)
            loss = "binary_crossentropy"
            metrics = ["accuracy", keras.metrics.AUC(name="auc")]
        else:
            # Multi-class: softmax → confidence = max(softmax)
            outputs = layers.Dense(
                self.num_classes, activation="softmax", name="output"
            )(x)
            loss = "categorical_crossentropy"
            metrics = [
                "accuracy",
                keras.metrics.TopKCategoricalAccuracy(k=2, name="top2_accuracy"),
            ]

        self.model = Model(inputs=inputs, outputs=outputs, name="atlas_receipt_model")

        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate),
            loss=loss,
            metrics=metrics,
        )

        log.info(f"✅ Model built — {self.model.count_params():,} parameters")
        self.model.summary(print_fn=log.info)
        return self.model

    def unfreeze_for_fine_tuning(self, fine_tune_at: int, new_lr: float):
        """
        Phase 2: Unfreeze MobileNetV2 from layer `fine_tune_at` onwards.
        Use a much lower learning rate to avoid destroying pretrained weights.
        """
        self.base_model.trainable = True
        for layer in self.base_model.layers[:fine_tune_at]:
            layer.trainable = False

        trainable_count = sum(
            1 for l in self.base_model.layers if l.trainable
        )
        log.info(
            f"🔓 Fine-tuning: unfroze {trainable_count} MobileNetV2 layers "
            f"(from layer {fine_tune_at})"
        )

        # Recompile with lower LR
        if self.num_classes == 2:
            loss = "binary_crossentropy"
            metrics = ["accuracy", keras.metrics.AUC(name="auc")]
        else:
            loss = "categorical_crossentropy"
            metrics = ["accuracy"]

        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=new_lr),
            loss=loss,
            metrics=metrics,
        )


# ─────────────────────────────────────────────
# TRAINING CALLBACKS
# ─────────────────────────────────────────────

def build_callbacks(output_dir: Path, phase: int) -> List[callbacks.Callback]:
    """Production-grade callbacks for training stability."""
    cb_list = [
        # Save best model by validation accuracy
        callbacks.ModelCheckpoint(
            filepath=str(output_dir / f"best_model_phase{phase}.h5"),
            monitor="val_accuracy",
            save_best_only=True,
            save_weights_only=False,
            mode="max",
            verbose=1,
        ),
        # Stop early if no improvement for 7 epochs
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=7,
            restore_best_weights=True,
            mode="max",
            verbose=1,
        ),
        # Reduce LR on plateau
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=4,
            min_lr=1e-7,
            verbose=1,
        ),
        # TensorBoard
        callbacks.TensorBoard(
            log_dir=str(output_dir / "logs" / f"phase{phase}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
            histogram_freq=1,
            update_freq="epoch",
        ),
        # CSV logging
        callbacks.CSVLogger(
            str(output_dir / f"training_log_phase{phase}.csv"),
            append=False,
        ),
    ]
    return cb_list


# ─────────────────────────────────────────────
# EVALUATION
# ─────────────────────────────────────────────

class ATLASEvaluator:
    def __init__(self, model: Model, test_gen, class_names: List[str], output_dir: Path):
        self.model       = model
        self.test_gen    = test_gen
        self.class_names = class_names
        self.output_dir  = output_dir
        self.num_classes = len(class_names)

    def evaluate(self) -> Dict:
        log.info("📊 Running evaluation on test set...")
        self.test_gen.reset()

        # Raw predictions
        y_pred_proba = self.model.predict(self.test_gen, verbose=1)
        y_true       = self.test_gen.classes

        if self.num_classes == 2:
            y_pred       = (y_pred_proba > 0.5).astype(int).flatten()
            y_pred_proba_flat = y_pred_proba.flatten()
            auc          = roc_auc_score(y_true, y_pred_proba_flat)
        else:
            y_pred       = np.argmax(y_pred_proba, axis=1)
            # Compute per-class confidence
            auc          = roc_auc_score(
                tf.keras.utils.to_categorical(y_true, self.num_classes),
                y_pred_proba,
                multi_class="ovr",
                average="macro",
            )

        acc = accuracy_score(y_true, y_pred)
        log.info(f"   Test Accuracy : {acc:.4f} ({acc*100:.2f}%)")
        log.info(f"   AUC-ROC       : {auc:.4f}")

        # Classification report
        report = classification_report(
            y_true, y_pred,
            target_names=self.class_names,
            output_dict=True,
        )
        log.info("\n" + classification_report(y_true, y_pred, target_names=self.class_names))

        # Confidence distribution
        if self.num_classes > 2:
            confidences = np.max(y_pred_proba, axis=1)
        else:
            confidences = np.abs(y_pred_proba.flatten() - 0.5) * 2  # distance from 0.5

        high_conf   = np.mean(confidences >= CONFIDENCE_HIGH)
        medium_conf = np.mean((confidences >= CONFIDENCE_MEDIUM) & (confidences < CONFIDENCE_HIGH))
        low_conf    = np.mean(confidences < CONFIDENCE_MEDIUM)

        log.info(f"\n   Confidence Distribution:")
        log.info(f"   High   (≥{CONFIDENCE_HIGH}):  {high_conf*100:.1f}%")
        log.info(f"   Medium ({CONFIDENCE_MEDIUM}–{CONFIDENCE_HIGH}): {medium_conf*100:.1f}%")
        log.info(f"   Low    (<{CONFIDENCE_MEDIUM}): {low_conf*100:.1f}%  ← user will be asked to retake")

        # Save plots
        self._plot_confusion_matrix(y_true, y_pred)
        self._plot_confidence_histogram(confidences)
        self._plot_training_curves()

        metrics = {
            "test_accuracy": float(acc),
            "auc_roc": float(auc),
            "confidence_high_pct": float(high_conf),
            "confidence_medium_pct": float(medium_conf),
            "confidence_low_pct": float(low_conf),
            "classification_report": report,
        }
        return metrics

    def _plot_confusion_matrix(self, y_true, y_pred):
        cm = confusion_matrix(y_true, y_pred)
        fig, ax = plt.subplots(figsize=(max(8, self.num_classes * 1.5), max(6, self.num_classes * 1.2)))
        sns.heatmap(
            cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=self.class_names,
            yticklabels=self.class_names,
            ax=ax,
        )
        ax.set_ylabel("True Label", fontsize=12)
        ax.set_xlabel("Predicted Label", fontsize=12)
        ax.set_title("ATLAS Model — Confusion Matrix (Test Set)", fontsize=14, pad=15)
        plt.tight_layout()
        path = self.output_dir / "confusion_matrix.png"
        plt.savefig(path, dpi=150)
        plt.close()
        log.info(f"   📊 Confusion matrix saved → {path}")

    def _plot_confidence_histogram(self, confidences):
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.hist(confidences, bins=50, color="#cc785c", edgecolor="white", alpha=0.85)
        ax.axvline(CONFIDENCE_HIGH,   color="#10b981", linestyle="--", linewidth=2, label=f"High ({CONFIDENCE_HIGH})")
        ax.axvline(CONFIDENCE_MEDIUM, color="#f59e0b", linestyle="--", linewidth=2, label=f"Medium ({CONFIDENCE_MEDIUM})")
        ax.set_xlabel("Confidence Score", fontsize=12)
        ax.set_ylabel("Count", fontsize=12)
        ax.set_title("ATLAS Model — Confidence Score Distribution", fontsize=14)
        ax.legend()
        ax.set_facecolor("#0d0d0d")
        fig.patch.set_facecolor("#1a1a1a")
        ax.tick_params(colors="white")
        ax.xaxis.label.set_color("white")
        ax.yaxis.label.set_color("white")
        ax.title.set_color("white")
        plt.tight_layout()
        path = self.output_dir / "confidence_histogram.png"
        plt.savefig(path, dpi=150, facecolor=fig.get_facecolor())
        plt.close()
        log.info(f"   📊 Confidence histogram saved → {path}")

    def _plot_training_curves(self):
        """Reads CSV log and plots loss + accuracy curves."""
        csv_path = self.output_dir / "training_log_phase1.csv"
        if not csv_path.exists():
            return
        import csv
        rows = []
        with open(csv_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append({k: float(v) for k, v in row.items()})

        epochs    = [r["epoch"] for r in rows]
        train_acc = [r["accuracy"] for r in rows]
        val_acc   = [r.get("val_accuracy", 0) for r in rows]
        train_los = [r["loss"] for r in rows]
        val_los   = [r.get("val_loss", 0) for r in rows]

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        ax1.plot(epochs, train_acc, label="Train Acc", color="#cc785c")
        ax1.plot(epochs, val_acc,   label="Val Acc",   color="#6b5dd3")
        ax1.set_title("Accuracy"); ax1.legend(); ax1.set_xlabel("Epoch")

        ax2.plot(epochs, train_los, label="Train Loss", color="#cc785c")
        ax2.plot(epochs, val_los,   label="Val Loss",   color="#6b5dd3")
        ax2.set_title("Loss"); ax2.legend(); ax2.set_xlabel("Epoch")

        plt.suptitle("ATLAS Model Training Curves", fontsize=14)
        plt.tight_layout()
        path = self.output_dir / "training_curves.png"
        plt.savefig(path, dpi=150)
        plt.close()
        log.info(f"   📊 Training curves saved → {path}")


# ─────────────────────────────────────────────
# MODEL EXPORT
# ─────────────────────────────────────────────

class ATLASModelExporter:
    def __init__(self, model: Model, output_dir: Path):
        self.model      = model
        self.output_dir = output_dir

    def export_saved_model(self) -> Path:
        """SavedModel format — required for ONNX + TFLite conversion."""
        path = self.output_dir / "atlas_receipt_savedmodel"
        self.model.export(str(path))
        log.info(f"✅ SavedModel exported → {path}")
        return path

    def export_h5(self) -> Path:
        """Keras .h5 — for easy re-loading in Python."""
        path = self.output_dir / "atlas_receipt_model.h5"
        self.model.save(str(path))
        log.info(f"✅ Keras .h5 exported → {path}")
        return path

    def export_tfjs(self, saved_model_path: Path):
        """
        TensorFlow.js — runs in browser + Node.js.
        Requires: pip install tensorflowjs
        """
        try:
            import tensorflowjs as tfjs
            tfjs_path = self.output_dir / "tfjs"
            tfjs_path.mkdir(exist_ok=True)
            tfjs.converters.convert_tf_saved_model(
                str(saved_model_path),
                str(tfjs_path),
            )
            log.info(f"✅ TensorFlow.js exported → {tfjs_path}")
        except ImportError:
            log.warning("⚠️  tensorflowjs not installed — skipping TF.js export")
            log.warning("   Run: pip install tensorflowjs")
        except Exception as e:
            log.error(f"❌ TF.js export failed: {e}")

    def export_tflite(self, saved_model_path: Path):
        """TFLite — for mobile (React Native via TFLite plugin)."""
        try:
            converter = tf.lite.TFLiteConverter.from_saved_model(str(saved_model_path))

            # Optimizations
            converter.optimizations = [tf.lite.Optimize.DEFAULT]

            # INT8 quantization for 4x size reduction (optional)
            # converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]

            tflite_model = converter.convert()
            path = self.output_dir / "atlas_receipt_model.tflite"
            path.write_bytes(tflite_model)
            size_mb = path.stat().st_size / 1024 / 1024
            log.info(f"✅ TFLite exported → {path}  ({size_mb:.2f} MB)")
        except Exception as e:
            log.error(f"❌ TFLite export failed: {e}")

    def export_onnx(self, saved_model_path: Path):
        """
        ONNX — for high-performance server inference.
        Requires: pip install tf2onnx onnx
        """
        try:
            import subprocess
            path = self.output_dir / "atlas_receipt_model.onnx"
            result = subprocess.run(
                [
                    sys.executable, "-m", "tf2onnx.convert",
                    "--saved-model", str(saved_model_path),
                    "--output", str(path),
                    "--opset", "17",
                ],
                capture_output=True, text=True,
            )
            if result.returncode == 0:
                size_mb = path.stat().st_size / 1024 / 1024
                log.info(f"✅ ONNX exported → {path}  ({size_mb:.2f} MB)")
            else:
                log.error(f"❌ ONNX export failed:\n{result.stderr}")
        except Exception as e:
            log.error(f"❌ ONNX export failed: {e}")


# ─────────────────────────────────────────────
# METADATA SAVER
# ─────────────────────────────────────────────

def save_metadata(
    output_dir: Path,
    class_names: List[str],
    metrics: Dict,
    args: argparse.Namespace,
    input_shape: Tuple,
):
    """Saves everything ATLAS needs at runtime to use the model correctly."""

    # Class label map
    label_map = {str(i): name for i, name in enumerate(class_names)}
    with open(output_dir / "class_labels.json", "w") as f:
        json.dump(label_map, f, indent=2)

    # Model metadata for ATLAS pipeline
    metadata = {
        "model_name": "atlas_receipt_model",
        "version": MODEL_VERSION,
        "trained_at": datetime.now().isoformat(),
        "input": {
            "shape": list(input_shape),
            "dtype": "float32",
            "preprocessing": "divide_by_255",
            "description": "RGB image normalized to [0,1]",
        },
        "output": {
            "num_classes": len(class_names),
            "class_names": class_names,
            "activation": "sigmoid" if len(class_names) == 2 else "softmax",
            "confidence_note": "For binary: output is P(positive). For multiclass: max(softmax) is confidence.",
        },
        "thresholds": {
            "high_confidence":   CONFIDENCE_HIGH,
            "medium_confidence": CONFIDENCE_MEDIUM,
            "reject_below":      CONFIDENCE_LOW,
            "behavior": {
                f">={CONFIDENCE_HIGH}":                   "auto-accept, show green badge",
                f">={CONFIDENCE_MEDIUM} and <{CONFIDENCE_HIGH}": "show to user for confirmation, amber badge",
                f"<{CONFIDENCE_MEDIUM}":                  "reject, prompt user to retake photo",
            },
        },
        "training": {
            "dataset_path":    args.dataset,
            "epochs":          args.epochs,
            "batch_size":      args.batch,
            "learning_rate":   args.lr,
            "fine_tune_at":    args.fine_tune_at,
            "fine_tune_epochs": args.fine_tune_epochs,
            "base_model":      "MobileNetV2 (ImageNet weights)",
            "augmentation": [
                "rotation_range=20 (tilt simulation)",
                "brightness_range=[0.5, 1.5] (faded / overexposed)",
                "channel_shift_range=30 (contrast variation)",
                "shear_range=10 (perspective distortion)",
                "zoom_range=0.15",
            ],
        },
        "performance": {
            "test_accuracy": metrics.get("test_accuracy"),
            "auc_roc":       metrics.get("auc_roc"),
            "confidence_distribution": {
                "high_pct":   metrics.get("confidence_high_pct"),
                "medium_pct": metrics.get("confidence_medium_pct"),
                "low_pct":    metrics.get("confidence_low_pct"),
            },
        },
        "atlas_integration": {
            "pipeline_file":   "lib/ai/pipeline.ts",
            "model_file":      "lib/ai/custom-model.ts",
            "tfjs_model_path": "public/models/atlas-receipt-v1/model.json",
            "server_usage":    "onnxruntime-node with atlas_receipt_model.onnx",
        },
    }

    with open(output_dir / "model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    log.info(f"✅ Metadata saved → {output_dir / 'model_metadata.json'}")
    log.info(f"✅ Class labels  → {output_dir / 'class_labels.json'}")


# ─────────────────────────────────────────────
# MAIN TRAINING LOOP
# ─────────────────────────────────────────────

def main():
    args = parse_args()
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    log.info("=" * 60)
    log.info("  ATLAS Receipt Intelligence Model — Training")
    log.info(f"  Dataset : {args.dataset}")
    log.info(f"  Output  : {args.output}")
    log.info(f"  Epochs  : {args.epochs}  |  Batch: {args.batch}  |  LR: {args.lr}")
    log.info(f"  GPU     : {tf.config.list_physical_devices('GPU')}")
    log.info("=" * 60)

    # ── 1. Data ────────────────────────────────────────────────────────
    pipeline = ATLASDataPipeline(
        dataset_dir=args.dataset,
        batch_size=args.batch,
        img_size=IMG_SIZE,
    )
    train_gen, val_gen, test_gen, class_names, class_weights = pipeline.build()
    num_classes = len(class_names)

    # ── 2. Model ───────────────────────────────────────────────────────
    builder = ATLASReceiptModel(
        num_classes=num_classes,
        input_shape=INPUT_SHAPE,
        learning_rate=args.lr,
    )
    model = builder.build()

    # ── 3. Phase 1: Train head only ────────────────────────────────────
    log.info("\n🚀 PHASE 1: Training classification head (base frozen)")
    history_p1 = model.fit(
        train_gen,
        epochs=args.epochs,
        validation_data=val_gen,
        class_weight=class_weights,
        callbacks=build_callbacks(output_dir, phase=1),
        verbose=1,
    )

    # ── 4. Phase 2: Fine-tune ──────────────────────────────────────────
    log.info(f"\n🔧 PHASE 2: Fine-tuning from layer {args.fine_tune_at}")
    builder.unfreeze_for_fine_tuning(
        fine_tune_at=args.fine_tune_at,
        new_lr=args.lr / 10,   # 10x lower LR for fine-tuning
    )
    history_p2 = model.fit(
        train_gen,
        epochs=args.fine_tune_epochs,
        validation_data=val_gen,
        class_weight=class_weights,
        callbacks=build_callbacks(output_dir, phase=2),
        verbose=1,
    )

    # ── 5. Evaluate ────────────────────────────────────────────────────
    evaluator = ATLASEvaluator(model, test_gen, class_names, output_dir)
    metrics   = evaluator.evaluate()

    # ── 6. Export ──────────────────────────────────────────────────────
    log.info("\n📦 Exporting model in all formats...")
    exporter          = ATLASModelExporter(model, output_dir)
    exporter.export_h5()
    saved_model_path  = exporter.export_saved_model()

    if not args.no_export_tfjs:
        exporter.export_tfjs(saved_model_path)

    if not args.no_export_tflite:
        exporter.export_tflite(saved_model_path)

    if not args.no_export_onnx:
        exporter.export_onnx(saved_model_path)

    # ── 7. Metadata ────────────────────────────────────────────────────
    save_metadata(output_dir, class_names, metrics, args, INPUT_SHAPE)

    log.info("\n" + "=" * 60)
    log.info("  ✅ ATLAS MODEL TRAINING COMPLETE")
    log.info(f"  Test Accuracy : {metrics['test_accuracy']*100:.2f}%")
    log.info(f"  AUC-ROC       : {metrics['auc_roc']:.4f}")
    log.info(f"  All outputs   : {output_dir}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
