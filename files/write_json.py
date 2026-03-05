import json
import os

os.makedirs("models", exist_ok=True)

with open("models/class_labels.json", "w", encoding="utf-8") as f:
    json.dump({"0": "grocery", "1": "restaurant"}, f)

with open("models/model_metadata.json", "w", encoding="utf-8") as f:
    json.dump({
        "version": "1.0.0",
        "thresholds": {
            "high_confidence": 0.85,
            "medium_confidence": 0.60,
            "reject_below": 0.60
        }
    }, f)

print("Wrote JSON files successfully.")
