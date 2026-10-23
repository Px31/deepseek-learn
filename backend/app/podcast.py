import os
import subprocess
import urllib.request
import uuid
from config import PODCAST_DIR, VOICE_DIR

VOICE_MODEL = "en_US-lessac-medium"
MODEL_URL = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/{VOICE_MODEL}.onnx"
CONFIG_URL = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/{VOICE_MODEL}.onnx.json"

def download_voice_model():
    model_path = os.path.join(VOICE_DIR, f"{VOICE_MODEL}.onnx")
    config_path = os.path.join(VOICE_DIR, f"{VOICE_MODEL}.onnx.json")
    
    if not os.path.exists(model_path):
        print("Downloading voice model (this may take a minute)...")
        urllib.request.urlretrieve(MODEL_URL, model_path)
    if not os.path.exists(config_path):
        urllib.request.urlretrieve(CONFIG_URL, config_path)

def generate_audio(script: str) -> str:
    download_voice_model()
    
    filename = f"{uuid.uuid4()}.wav"
    output_path = os.path.join(PODCAST_DIR, filename)
    
    command = [
        "piper",
        "--model", os.path.join(VOICE_DIR, f"{VOICE_MODEL}.onnx"),
        "--config", os.path.join(VOICE_DIR, f"{VOICE_MODEL}.onnx.json"),
        "--output_file", output_path
    ]
    
    process = subprocess.Popen(command, stdin=subprocess.PIPE, text=True)
    process.communicate(input=script)
    
    return f"/static/podcasts/{filename}"
