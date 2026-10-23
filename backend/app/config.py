import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8888))
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
CHROMA_PATH = "./chroma_db"
PODCAST_DIR = "./static/podcasts"
VOICE_DIR = "./voices"

os.makedirs(PODCAST_DIR, exist_ok=True)
os.makedirs(VOICE_DIR, exist_ok=True)
