# Manual install

Everything runs locally. No accounts, no cloud, no telemetry.

## 1. What you need

| Dependency | Version | Notes |
|---|---|---|
| Python | 3.10 – 3.13 | 3.13 recommended (that's what the lock file is verified on) |
| Node.js | 18+ (20 LTS best) | for the Vite frontend |
| ffmpeg | any recent | audio transcoding for Whisper |
| Ollama | latest | LLM runtime (**64-bit only**, see step 5) |
| git | any | for cloning |

## 2. Install system dependencies (pick your distro)

### Debian / Ubuntu

```bash
sudo apt update
sudo apt install -y git ffmpeg python3 python3-venv python3-pip ca-certificates curl gnupg
# Node 20 from NodeSource (Ubuntu's nodejs is too old for Vite):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Ollama:
curl -fsSL https://ollama.com/install.sh | sudo sh
```

### Fedora / RHEL / Rocky / Alma

```bash
sudo dnf install -y git ffmpeg python3 python3-pip nodejs npm ca-certificates curl
curl -fsSL https://ollama.com/install.sh | sudo sh
# If your RHEL-family has no nodejs package:
#   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo dnf install -y nodejs
```

### Arch / Manjaro

```bash
sudo pacman -S --noconfirm git ffmpeg python python-node curl ca-certificates
curl -fsSL https://ollama.com/install.sh | sudo sh
```

### openSUSE

```bash
sudo zypper --non-interactive install git ffmpeg python3 python3-pip ca-certificates curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo zypper --non-interactive refresh
sudo zypper --non-interactive install nodejs
curl -fsSL https://ollama.com/install.sh | sudo sh
```

### Windows (10/11, x64 or 32-bit)

1. **Git for Windows**: <https://git-scm.com/> (or `winget install Git.Git`)
2. **Python 3.10–3.13**: <https://www.python.org/downloads/> or `winget install Python.Python.3.12`
   (on 32-bit Windows pick the *32-bit* installer from the "Other installers" link)
3. **Node.js 20 LTS**: `winget install OpenJS.NodeJS.LTS` or <https://nodejs.org/>
4. **ffmpeg**: `winget install Gyan.FFmpeg` (or `choco install ffmpeg`)
5. **Ollama**: `winget install Ollama.Ollama` (or <https://ollama.com/download>)
   **32-bit Windows: Ollama has no 32-bit build.** Install it on any 64-bit
   machine you can reach and set `OLLAMA_HOST` in `.env` (see step 5).

Or, for the Linux distros above, just run the matching script:

```bash
bash scripts/deps/apt.sh     # Debian/Ubuntu
bash scripts/deps/dnf.sh     # Fedora/RHEL
bash scripts/deps/pacman.sh  # Arch
bash scripts/deps/zypper.sh  # openSUSE
```

## 3. Get the app and pull the models

```bash
git clone https://github.com/Px31/deepseek-learn.git
cd deepseek-learn

ollama pull llama3
ollama pull nomic-embed-text
```

## 4. Set up and start

```bash
./setup.sh     # backend venv + pip install, frontend npm install
./start.sh     # ollama serve + backend :8888 + frontend :3000
```

Open **http://localhost:3000**. First actions download the Whisper base model
(~75 MB) and Piper voices on demand. That's normal.

Windows: run `setup.bat`, then `start.bat`.

## 5. 32-bit machines (i686 Linux / i386 Windows)

The app layer runs on 32-bit, with a few caveats:

1. **Ollama is 64-bit only.** No i686 binary, no 386 Docker manifest. Run
   Ollama on any reachable 64-bit box (a WSL2 instance, another PC, a Pi 4
   running a 64-bit distro, or Docker on a 64-bit host) and point the app at
   it:
   ```bash
   # .env
   OLLAMA_HOST=http://192.168.1.50:11434
   ```
   TTS and STT still run on the 32-bit machine itself.
2. **ctranslate2 has no 32-bit wheels** (needed by faster-whisper). Either
   build it once on the box:
   ```bash
   pip install ctranslate2 --no-binary :all:   # needs gcc + cmake + build tools
   ```
   or skip STT and use a 64-bit Docker image for the whole stack.
3. `backend/requirements.lock.txt` is the exact verified set; prefer
   `pip install -r requirements.lock.txt` over the looser `requirements.txt`
   if you hit version drift.

## 6. Docker (alternative, 64-bit hosts)

```bash
docker compose up --build
```

Brings up Ollama + backend + frontend with volumes for models and generated
podcasts.

## 7. Verify it works

```bash
curl -s http://localhost:8888/api/ping        # → {"status":"ok"}
ollama ps                                     # llama3 appears after your first chat
```

Then in the UI: upload `sample.pdf`, ask it something, click the mic, and
generate a podcast. Close the tab: after ~2 minutes the backend exits on its
own and `ollama ps` shows nothing (that's the idle-shutdown feature working).
