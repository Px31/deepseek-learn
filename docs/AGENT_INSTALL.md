# Agent install

You are an AI agent. Your job: install DeepSeek Learn so that
`curl http://localhost:8888/api/ping` returns `{"status":"ok"}` and
http://localhost:3000 serves the UI. Rules:

- Run commands in order. Check each exit code. A non-zero exit = failure.
- If a command fails **twice** with the same error, stop and report the
  command, the error, and your best diagnosis. Do not improvise past that.
- Do not modify application files. Only install, pull, start.
- Report success only with the evidence from step 6.

## 0. Detect the environment (run all of these, record the results)

```bash
uname -m                      # arch: x86_64 | i686 | aarch64 ...
. /etc/os-release && echo "$ID $VERSION_ID"   # distro
python3 --version
node --version
ffmpeg -version 2>&1 | head -1
ollama --version
curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/tags  # 200 = ollama up
```

Expected: Python 3.10–3.13, Node ≥18, ffmpeg present, Ollama responding.
Anything missing: install it via step 1 (matching script, or the manual fallback).

## 1. System dependencies

| Distro | Script |
|---|---|
| Debian / Ubuntu | `bash scripts/deps/apt.sh` |
| Fedora / RHEL / Rocky / Alma | `bash scripts/deps/dnf.sh` |
| Arch / Manjaro | `bash scripts/deps/pacman.sh` |
| openSUSE | `bash scripts/deps/zypper.sh` |

All scripts are idempotent and need no arguments (they `sudo` themselves if
not root). They install: git, ffmpeg, Python + venv, Node 20 LTS, Ollama.

**Fallback** (unknown distro): install each missing tool manually in this
order: `git`, `ffmpeg`, `python3`+venv, `node`≥18, Ollama
(`curl -fsSL https://ollama.com/install.sh | sudo sh`).

**32-bit (i686/i386):** the scripts will install Ollama only if a 64-bit
runtime exists. If `uname -m` is `i686`/`i386`: expect Ollama to be **absent
locally**. A 64-bit Ollama must be reachable, so set
`OLLAMA_HOST=http://<host>:11434` in `.env`. STT/TTS still work
locally (ctranslate2 may need `pip install ctranslate2 --no-binary :all:`).

## 2. Models

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

Verify: `ollama list` shows both. (If Ollama is remote, run these on the
machine that hosts Ollama.)

## 3. App setup

```bash
git clone https://github.com/Px31/deepseek-learn.git   # or: you already have the checkout
cd deepseek-learn
cp .env.example .env    # defaults are fine; edit OLLAMA_HOST if remote
./setup.sh              # backend venv + pip install; frontend npm install
```

`setup.sh` is safe to re-run. If `pip` complains about version conflicts,
retry with the locked set:
`cd backend && source venv/bin/activate && pip install -r requirements.lock.txt`.

## 4. Start

```bash
nohup ./start.sh > /tmp/deepseek-learn.log 2>&1 &
```

`start.sh` launches `ollama serve` (skips harmlessly if one is already
running), the backend on :8888, and the frontend on :3000.
First backend start is slow: Whisper model load (~10–30 s).

## 5. Wait

Poll (timeout 90 s): `curl -sf http://localhost:8888/api/ping` until it
returns `{"status":"ok"}`. Frontend: `curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200`.

## 6. Proof of success (report all of these)

```bash
curl -s http://localhost:8888/api/ping
# {"status":"ok"}

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
# 200

curl -s -X POST -F "file=@sample.pdf" -F "notebook_id=default_notebook" http://localhost:8888/api/upload
# {"status":"success",...}

curl -s -X POST -d "query=What is this document about?" -d "notebook_id=default_notebook" http://localhost:8888/api/chat
# {"response":"..."}  (a real sentence, not an error)
```

## 7. Error recovery

| Symptom | Diagnosis → Fix |
|---|---|
| `pip` version conflicts / build failures | Old or mismatched pins → `pip install -r backend/requirements.lock.txt` (Python 3.13 verified) |
| `ctranslate2` no wheel for your arch | 32-bit box → `pip install ctranslate2 --no-binary :all:` (needs gcc, cmake) or use Docker |
| `Connection refused` on `:11434` at chat time | Ollama not running → `nohup ollama serve &`; or wrong `OLLAMA_HOST` in `.env` |
| `ollama serve` fails to start on i686 | No 32-bit Ollama → remote Ollama + `OLLAMA_HOST` (step 0 note) |
| Port 8888 already in use | `ss -tlnp | grep 8888` → kill the stale backend (`pkill -f "app/[m]ain.py"`, bracket form to avoid self-kill) |
| Backend exits ~2 min after start with no traffic | Not a bug: idle watchdog (`IDLE_SHUTDOWN_SECONDS`). Set `IDLE_SHUTDOWN_SECONDS=0` in `.env` while testing |
| `npm run dev` fails: node too old | Node ≥18 required → install Node 20 (step 1) |
| Upload works but chat says "no context" | Model is loose with tiny sources → rephrase the question; confirm the notebook has sources |
| `npm`/`pip` network timeout | Retry once; then check proxy env vars (`http_proxy`/`https_proxy`) |

## 8. Stop everything (when done)

```bash
pkill -f "app/[m]ain.py"
pkill -f "vite"
# (ollama serve can keep running; models auto-unload after 5 min or via POST /api/shutdown)
```
