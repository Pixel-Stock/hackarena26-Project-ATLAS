"""
ATLAS Receipt Model — Phase 2 Fine-Tuning
==========================================
Loads the Phase 1 trained model and continues training
with MobileNetV2 layers unfrozen for deeper feature extraction.

Run AFTER train.py has completed Phase 1.

Usage:
  python fine_tune.py \
    --base_model ./models/best_model_phase1.h5 \
    --dataset ./dataset \
    --output ./models \
    --unfreeze_from 100 \
    --epochs 15 \
    --lr 0.00001

What this does differently from Phase 1:
  - Loads frozen Phase 1 model
  - Unfreezes MobileNetV2 from layer `unfreeze_from` onwards
  - Trains at 10x lower LR to avoid catastrophic forgetting
  - Uses stronger augmentation to fight overfitting on unfrozen layers
  - Applies label smoothing for better calibration
  - Saves best model + exports all formats
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Tuple

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
from sklearn.utils.class_weight import compute_class_weight

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("atlas.finetune")

IMG_SIZE   = (224, 224)
INPUT_SHAPE = (224, 224, 3)
SEED       = 42
tf.random.set_seed(SEED)
np.random.seed(SEED)


# ─────────────────────────────────────────────
# ARGS
# ─────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="ATLAS Phase 2 Fine-Tuning")
    p.add_argument("--base_model",     required=True,        help="Path to Phase 1 .h5 model")
    p.add_argument("--dataset",        default="./dataset",  help="Dataset root dir")
    p.add_argument("--output",         default="./models",   help="Output directory")
    p.add_argument("--unfreeze_from",  type=int, default=100,help="Unfreeze MobileNetV2 from this layer index")
    p.add_argument("--epochs",         type=int, default=15, help="Fine-tuning epochs")
    p.add_argument("--lr",             type=float, default=1e-5, help="Fine-tuning LR (should be << Phase 1 LR)")
    p.add_argument("--batch",          type=int, default=16, help="Batch size (smaller for fine-tuning)")
    p.add_argument("--label_smoothing",type=float, default=0.1, help="Label smoothing factor")
    return p.parse_args()


# ─────────────────────────────────────────────
# DATA (stronger augmentation for fine-tuning)
# ─────────────────────────────────────────────

def build_generators(dataset_dir: str, batch_size: int):
    """Fine-tuning uses stronger augmentation to fight overfitting."""

    # Stronger than Phase 1 — unfrozen layers need regularization
    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=25,            # slightly stronger tilt
        width_shift_range=0.15,
        height_shift_range=0.15,
        shear_range=12,
        zoom_range=0.20,
        brightness_range=[0.4, 1.6],  # stronger contrast variation
        channel_shift_range=40,
        horizontal_flip=False,
        fill_mode="nearest",
    )

    eval_gen = ImageDataGenerator(rescale=1.0 / 255)

    root = Path(dataset_dir)
    flow_kwargs = dict(
        target_size=IMG_SIZE,
        batch_size=batch_size,
        seed=SEED,
        interpolation="lanczos",
    )

    # Detect binary or multi-class
    num_classes = len([d for d in (root / "train").iterdir() if d.is_dir()])
    class_mode  = "binary" if num_classes == 2 else "categorical"
    flow_kwargs["class_mode"] = class_mode

    train = train_gen.flow_from_directory(str(root / "train"),      shuffle=True,  **flow_kwargs)
    val   = eval_gen.flow_from_directory(str(root / "validation"),  shuffle=False, **flow_kwargs)
    test  = eval_gen.flow_from_directory(str(root / "test"),        shuffle=False, **flow_kwargs)

    # Class weights
    weights_arr = compute_class_weight("balanced", classes=np.unique(train.classes), y=train.classes)
    class_weights = dict(enumerate(weights_arr))

    return train, val, test, train.class_indices, class_weights, class_mode


# ─────────────────────────────────────────────
# MODEL UNFREEZING
# ─────────────────────────────────────────────

def prepare_model_for_fine_tuning(
    model_path: str,
    unfreeze_from: int,
    lr: float,
    class_mode: str,
    label_smoothing: float,
) -> keras.Model:
    """
    Load Phase 1 model, unfreeze from layer `unfreeze_from`.
    The key trick: BatchNorm layers stay FROZEN during fine-tuning.
    Unfreezing BatchNorm causes training instability.
    """
    log.info(f"📂 Loading Phase 1 model from: {model_path}")
    model = keras.models.load_model(model_path)

    # Find the MobileNetV2 base layer
    base_layer = None
    for layer in model.layers:
        if "mobilenet" in layer.name.lower():
            base_layer = layer
            break

    if base_layer is None:
        log.warning("⚠️  Could not find MobileNetV2 base layer. Unfreezing all layers.")
        for layer in model.layers:
            if not isinstance(layer, layers.BatchNormalization):
                layer.trainable = True
    else:
        base_layer.trainable = True
        # Freeze layers before unfreeze_from, keep BN always frozen
        for i, layer in enumerate(base_layer.layers):
            if isinstance(layer, layers.BatchNormalization):
                layer.trainable = False   # ALWAYS keep BN frozen
            elif i < unfreeze_from:
                layer.trainable = False
            else:
                layer.trainable = True

        trainable = sum(1 for l in base_layer.layers if l.trainable)
        frozen    = len(base_layer.layers) - trainable
        log.info(f"🔓 Unfroze {trainable} layers, kept {frozen} frozen (incl. all BatchNorm)")

    # Recompile with label smoothing for better confidence calibration
    if class_mode == "binary":
        loss    = keras.losses.BinaryCrossentropy(label_smoothing=label_smoothing)
        metrics = ["accuracy", keras.metrics.AUC(name="auc")]
    else:
        loss    = keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing)
        metrics = ["accuracy", keras.metrics.TopKCategoricalAccuracy(k=2, name="top2")]

    model.compile(
        optimizer=keras.optimizers.Adam(
            learning_rate=lr,
            clipnorm=1.0,          # gradient clipping for stability
        ),
        loss=loss,
        metrics=metrics,
    )

    total_params     = model.count_params()
    trainable_params = sum(tf.size(w).numpy() for w in model.trainable_weights)
    log.info(f"📊 Total params:     {total_params:,}")
    log.info(f"📊 Trainable params: {trainable_params:,}  ({trainable_params/total_params*100:.1f}%)")

    return model


# ─────────────────────────────────────────────
# CALLBACKS
# ─────────────────────────────────────────────

def build_callbacks(output_dir: Path) -> List:
    return [
        callbacks.ModelCheckpoint(
            filepath=str(output_dir / "best_model_finetuned.h5"),
            monitor="val_accuracy",
            save_best_only=True,
            mode="max",
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=5,             # tighter patience for fine-tuning
            restore_best_weights=True,
            mode="max",
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.3,             # more aggressive LR reduction
            patience=3,
            min_lr=1e-8,
            verbose=1,
        ),
        callbacks.TensorBoard(
            log_dir=str(output_dir / "logs" / f"finetune_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
            histogram_freq=1,
        ),
        callbacks.CSVLogger(str(output_dir / "training_log_finetune.csv")),
    ]


# ─────────────────────────────────────────────
# EVALUATION + EXPORT
# ─────────────────────────────────────────────

def evaluate_and_export(model, test_gen, class_names, output_dir: Path, class_mode: str):
    log.info("📊 Evaluating fine-tuned model on test set...")
    test_gen.reset()

    y_pred_raw = model.predict(test_gen, verbose=1)
    y_true     = test_gen.classes

    if class_mode == "binary":
        y_pred = (y_pred_raw > 0.5).astype(int).flatten()
        auc    = roc_auc_score(y_true, y_pred_raw.flatten())
    else:
        y_pred = np.argmax(y_pred_raw, axis=1)
        auc    = roc_auc_score(
            tf.keras.utils.to_categorical(y_true, len(class_names)),
            y_pred_raw, multi_class="ovr", average="macro",
        )

    acc = accuracy_score(y_true, y_pred)
    log.info(f"   ✅ Test Accuracy : {acc*100:.2f}%")
    log.info(f"   ✅ AUC-ROC       : {auc:.4f}")
    log.info("\n" + classification_report(y_true, y_pred, target_names=class_names))

    # Export all formats
    log.info("📦 Exporting fine-tuned model...")

    # H5
    h5_path = output_dir / "atlas_receipt_model_finetuned.h5"
    model.save(str(h5_path))
    log.info(f"   ✅ H5: {h5_path}")

    # SavedModel
    saved_path = output_dir / "atlas_receipt_savedmodel_finetuned"
    model.export(str(saved_path))
    log.info(f"   ✅ SavedModel: {saved_path}")

    # TF.js
    try:
        import tensorflowjs as tfjs
        tfjs_path = output_dir / "tfjs_finetuned"
        tfjs_path.mkdir(exist_ok=True)
        tfjs.converters.convert_tf_saved_model(str(saved_path), str(tfjs_path))
        log.info(f"   ✅ TF.js: {tfjs_path}")
    except Exception as e:
        log.warning(f"   ⚠️  TF.js export skipped: {e}")

    # TFLite
    try:
        converter = tf.lite.TFLiteConverter.from_saved_model(str(saved_path))
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        tflite_model = converter.convert()
        tflite_path  = output_dir / "atlas_receipt_model_finetuned.tflite"
        tflite_path.write_bytes(tflite_model)
        log.info(f"   ✅ TFLite: {tflite_path}  ({tflite_path.stat().st_size/1024/1024:.2f} MB)")
    except Exception as e:
        log.warning(f"   ⚠️  TFLite export skipped: {e}")

    # ONNX
    try:
        import subprocess
        onnx_path = output_dir / "atlas_receipt_model_finetuned.onnx"
        result = subprocess.run(
            [sys.executable, "-m", "tf2onnx.convert",
             "--saved-model", str(saved_path),
             "--output", str(onnx_path),
             "--opset", "17"],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            log.info(f"   ✅ ONNX: {onnx_path}  ({onnx_path.stat().st_size/1024/1024:.2f} MB)")
        else:
            log.warning(f"   ⚠️  ONNX failed: {result.stderr[:200]}")
    except Exception as e:
        log.warning(f"   ⚠️  ONNX export skipped: {e}")

    # Update metadata
    metadata_path = output_dir / "model_metadata.json"
    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
        metadata["fine_tuned"] = True
        metadata["fine_tuned_at"] = datetime.now().isoformat()
        metadata["performance"]["fine_tuned_accuracy"] = float(acc)
        metadata["performance"]["fine_tuned_auc"]      = float(auc)
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        log.info(f"   ✅ metadata.json updated")

    return acc, auc


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    args = parse_args()
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    log.info("═" * 60)
    log.info("  ATLAS Receipt Model — Phase 2 Fine-Tuning")
    log.info(f"  Base model    : {args.base_model}")
    log.info(f"  Unfreeze from : layer {args.unfreeze_from}")
    log.info(f"  Learning rate : {args.lr}")
    log.info(f"  Epochs        : {args.epochs}")
    log.info(f"  Batch size    : {args.batch}")
    log.info(f"  GPU available : {tf.config.list_physical_devices('GPU')}")
    log.info("═" * 60)

    # Data
    train_gen, val_gen, test_gen, class_idx, class_weights, class_mode = build_generators(
        args.dataset, args.batch
    )
    class_names = [k for k, v in sorted(class_idx.items(), key=lambda x: x[1])]
    log.info(f"📁 Classes: {class_names}")

    # Model
    model = prepare_model_for_fine_tuning(
        model_path=args.base_model,
        unfreeze_from=args.unfreeze_from,
        lr=args.lr,
        class_mode=class_mode,
        label_smoothing=args.label_smoothing,
    )

    # Train
    log.info(f"\n🚀 Fine-tuning for {args.epochs} epochs...")
    model.fit(
        train_gen,
        epochs=args.epochs,
        validation_data=val_gen,
        class_weight=class_weights,
        callbacks=build_callbacks(output_dir),
        verbose=1,
    )

    # Evaluate + Export
    acc, auc = evaluate_and_export(model, test_gen, class_names, output_dir, class_mode)

    log.info("\n" + "═" * 60)
    log.info("  ✅ FINE-TUNING COMPLETE")
    log.info(f"  Test Accuracy : {acc*100:.2f}%")
    log.info(f"  AUC-ROC       : {auc:.4f}")
    log.info(f"  All outputs   : {output_dir}")
    log.info("  NEXT STEP: Update ATLAS_ML_SERVER_URL to use")
    log.info("  atlas_receipt_model_finetuned.onnx")
    log.info("═" * 60)


if __name__ == "__main__":
    main()
