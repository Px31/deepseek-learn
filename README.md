# DeepSeek Learn

A fully **local, no-cloud** NotebookLM-style study assistant. Upload PDFs, text
files, and audio (MP3, M4A, OGG, WAV, WebM, FLAC), or just talk into the mic.
Then chat with your material, ask for a two-speaker audio podcast of it, and
have the app whisper everything back. Every byte stays on your machine:
[Ollama](https://ollama.com) (llama3 + nomic-embed-text) for the brain,
ChromaDB for memory, faster-whisper for ears, Piper for the voice.

| | |
|---|---|
| **Backend** | FastAPI (port 8888), LangChain + ChromaDB RAG, run-in-threadpool (never blocks) |
| **Frontend** | React + Vite + Tailwind (port 3000), flat DeepSeek aesthetic (#1e1e1e / #4d6bfe) |
| **LLM** | llama3 via Ollama (RAG-grounded chat, podcast scripts) |
| **TTS** | Piper → WAV podcasts (22050 Hz mono) served from `/static/podcasts` |
| **STT** | faster-whisper (base, int8), for browser mic and audio uploads |
| **RAM hygiene** | Close the browser tab → backend unloads Ollama models and exits itself |

---

## Quick start

```bash
./setup.sh     # creates venv, installs deps, builds frontend
./start.sh     # ollama + backend + frontend
# → http://localhost:3000
```

Windows: `setup.bat`, then `start.bat`. Or the whole stack in Docker:
`docker compose up --build`.

First run downloads the Whisper base model and (on demand) Piper voice
models; podcasts and voice files land in `backend/static/` and
`backend/voices/` (both gitignored, auto-created).

## Install guides

| You are | Read |
|---|---|
| A human on Debian/Ubuntu, Fedora/RHEL, Arch, openSUSE, or Windows | [docs/MANUAL_INSTALL.md](docs/MANUAL_INSTALL.md) |
| An AI agent (deterministic commands, expected outputs, error recovery) | [docs/AGENT_INSTALL.md](docs/AGENT_INSTALL.md) |

Per-distro one-liners for system dependencies: `scripts/deps/apt.sh`,
`scripts/deps/dnf.sh`, `scripts/deps/pacman.sh`, `scripts/deps/zypper.sh`.

## 32-bit support (read this)

DeepSeek Learn targets **32-bit Linux (i686) and 32-bit Windows (i386)**, with
these caveats:

| Component | 32-bit status |
|---|---|
| Python 3.10–3.13 (i686 / win32) | ✅ works; most deps have i686/win32 wheels |
| onnxruntime, av (PyAV) | ✅ i686 / win32 wheels exist |
| ctranslate2 (faster-whisper) | ⚠️ **no 32-bit wheels**, build from source (`pip install ctranslate2 --no-binary :all:` with gcc + cmake), or use the Docker path |
| Ollama | ⚠️ **no 32-bit build exists** (no i686 binary, no 386 Docker manifest) |

**The Ollama problem:** Ollama only runs on 64-bit. So on a 32-bit machine,
run it somewhere else: a 64-bit neighbor, a WSL2 box, a Raspberry Pi 4, or
Docker on a 64-bit host. Then point the app at it:

```bash
# in .env
OLLAMA_HOST=http://192.168.1.50:11434
```

The app is network-transparent: embeddings and chat both go to `OLLAMA_HOST`.
TTS (Piper) and STT (faster-whisper) run fine on the 32-bit box itself, only
the LLM needs a 64-bit home. Or just run the entire `docker-compose.yml`
stack on a 64-bit host and browse it from the 32-bit machine.

`backend/requirements.lock.txt` is the exact verified dependency set
(Python 3.13). Use it when reproducing a working install.

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama base URL (see 32-bit notes) |
| `BACKEND_PORT` | `8888` | FastAPI port |
| `FRONTEND_PORT` | `3000` | Vite dev port (informational) |
| `IDLE_SHUTDOWN_SECONDS` | `120` | Idle auto-shutdown; `0` = disabled |

## Idle lifecycle (RAM hygiene)

The web app heartbeats `GET /api/ping` every 30 s while its tab is open and
fires a `sendBeacon` `POST /api/shutdown` when the tab closes. A backend
watchdog also self-terminates if *nothing* is heard for `IDLE_SHUTDOWN_SECONDS`
(covers force-quit tabs and browser crashes). Shutdown = unload every loaded
Ollama model (`keep_alive: 0`) → `os._exit(0)` → Whisper and Piper RAM freed.
Net effect: **close the browser, get your RAM back.**

## API

| Method & path | Purpose |
|---|---|
| `POST /api/upload` | Ingest a PDF / text / audio file into a notebook (audio → Whisper transcript, indexed as source) |
| `POST /api/chat` | RAG-grounded answer (top-4 ChromaDB chunks → llama3) |
| `POST /api/podcast` | Generate two-speaker script + Piper WAV; returns `audio_url` |
| `POST /api/transcribe` | Whisper STT of an uploaded audio blob (mic input) |
| `DELETE /api/notebooks/{id}` | Drop a notebook and its ChromaDB collection |
| `GET /api/ping` | Heartbeat (activity marker) |
| `POST /api/shutdown` | Unload Ollama models + exit process |

All request bodies are `multipart/form-data` (`file` / `query` + `notebook_id`).

## Repository layout

```
├── backend/
│   ├── app/{main,config,rag,podcast,stt,lifecycle}.py
│   ├── requirements.txt          # top-level pins
│   ├── requirements.lock.txt     # exact verified set (pip freeze)
│   └── Dockerfile
├── frontend/                     # React + Vite + Tailwind
├── docs/{MANUAL_INSTALL,AGENT_INSTALL}.md
├── scripts/deps/{apt,dnf,pacman,zypper}.sh
├── docker-compose.yml            # ollama + backend + frontend
├── .env.example
├── setup.{sh,bat}  start.{sh,bat}
└── sample.pdf
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Connection refused` on `:11434` | `ollama serve` isn't running (or wrong `OLLAMA_HOST`) |
| Chat says "no context" | llama3 is loose with tiny chunks. Rephrase the question, or check the notebook actually has sources |
| Slow first chat | model is loading into RAM; subsequent chats are fast until idle-unload |
| Port 8888 busy | set `BACKEND_PORT` in `.env` |
| Backend died and nothing restarts it by design | run `./start.sh` again, that's the idle watchdog doing its job |
