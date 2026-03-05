import numpy as np
import tensorflow as tf
import tf2onnx

# 1. Create a dummy model expecting (224, 224, 3) image input from server.py pipeline
model = tf.keras.Sequential([
    tf.keras.layers.InputLayer(input_shape=(224, 224, 3)),
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dense(2, activation='softmax') # 2 classes: grocery/restaurant
])

# 2. Compile and save as SavedModel temporarily so tf2onnx can load it
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Create a small dummy training batch
X = np.random.rand(10, 224, 224, 3).astype(np.float32)
y = np.array([[1,0],[0,1]] * 5) # one-hot

model.fit(X, y, epochs=1)
model.export("models/keras_dummy")

print("Exporting Keras model to ONNX...")
import subprocess
import sys
try:
    subprocess.run([sys.executable, "-m", "tf2onnx.convert", "--saved-model", "models/keras_dummy", "--output", "models/atlas_receipt_model.onnx"], check=True)
    print("Done. Wrote atlas_receipt_model.onnx")
except Exception as e:
    print(f"tf2onnx conversion failed: {e}")
