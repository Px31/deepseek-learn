from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from pypdf import PdfReader
import io
import os
import tempfile
import uuid

from rag import process_text, generate_chat_response, generate_podcast_script, delete_notebook, get_llm
from podcast import generate_audio
from stt import transcribe_audio # IMPORT STT
from lifecycle import request_started, request_finished, start_watchdog, shutdown_all
from config import BACKEND_PORT

app = FastAPI(title="DeepSeek Learn API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

AUDIO_EXTS = (".mp3", ".m4a", ".ogg", ".wav", ".webm", ".flac")

# counts in-flight requests so the idle watchdog can tell if the web app is open
class ActivityMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        request_started()
        try:
            await self.app(scope, receive, send)
        finally:
            request_finished()

app.add_middleware(ActivityMiddleware)

@app.post("/api/upload")
async def upload_source(file: UploadFile = File(...), notebook_id: str = Form(...)):
    # ... [keep existing upload logic] ...
    content = await file.read()
    text = ""
    transcript = None

    if file.filename.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
    elif file.filename.lower().endswith(AUDIO_EXTS):
        # Transcribe the audio, then ingest the transcript as a source
        temp_path = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.{file.filename.rsplit('.', 1)[-1]}")
        with open(temp_path, "wb") as f:
            f.write(content)
        try:
            transcript = await run_in_threadpool(transcribe_audio, temp_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        if not transcript:
            return {"status": "error", "message": "No speech detected in audio file"}
        text = f"[Transcript of {file.filename}]\n{transcript}"
    else:
        text = content.decode("utf-8")

    await run_in_threadpool(process_text, text, notebook_id)
    return {"status": "success", "message": f"Ingested {file.filename}", "transcript": transcript}

@app.post("/api/chat")
async def chat(query: str = Form(...), notebook_id: str = Form(...)):
    # ... [keep existing chat logic] ...
    response = await run_in_threadpool(generate_chat_response, query, notebook_id)
    return {"response": response}

@app.post("/api/podcast")
async def create_podcast(notebook_id: str = Form(...)):
    # ... [keep existing podcast logic] ...
    script = await run_in_threadpool(generate_podcast_script, notebook_id)
    audio_url = await run_in_threadpool(generate_audio, script)
    return {"audio_url": audio_url, "script": script}

@app.delete("/api/notebooks/{notebook_id}")
async def delete_notebook_endpoint(notebook_id: str):
    # ... [keep existing delete logic] ...
    await run_in_threadpool(delete_notebook, notebook_id)
    return {"status": "success", "message": "Notebook deleted"}

# NEW: Voice Transcription Endpoint
@app.post("/api/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    # Save the uploaded audio to a temp file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}.webm")

    with open(temp_path, "wb") as f:
        f.write(await file.read())

    try:
        # Transcribe using the threadpool
        text = await run_in_threadpool(transcribe_audio, temp_path)
        return {"text": text}
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/api/ping")
async def ping():
    # keepalive from the frontend; any request counts as "app is open"
    return {"status": "ok"}

@app.post("/api/shutdown")
async def shutdown():
    # the frontend sends this on tab close; unloads the ollama models and exits
    shutdown_all()

start_watchdog()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
