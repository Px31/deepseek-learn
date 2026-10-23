import os
from faster_whisper import WhisperModel

# Load the model globally so it's only loaded once into memory
# "base" is fast, "small" is more accurate but slower.
# compute_type="int8" makes it run fast on standard CPUs.
print("Loading Whisper model (this may take a moment on first run)...")
model = WhisperModel("base", device="cpu", compute_type="int8")

def transcribe_audio(file_path: str) -> str:
    segments, info = model.transcribe(file_path, beam_size=5)

    text = ""
    for segment in segments:
        text += segment.text + " "

    return text.strip()
