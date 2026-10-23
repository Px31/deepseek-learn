# the web app pings every 30s while its tab is open. if nothing is heard
# for IDLE_SHUTDOWN_SECONDS we assume the tab is closed, unload the ollama
# models and exit, so the RAM gets freed. POST /api/shutdown (sent by the
# frontend on tab close) does the same thing right away.
import json
import os
import threading
import time
import urllib.request

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
IDLE_TIMEOUT = float(os.getenv("IDLE_SHUTDOWN_SECONDS", "120"))

_last_activity = time.monotonic()
_in_flight = 0
_shutdown_started = False


def touch():
    global _last_activity
    _last_activity = time.monotonic()


def request_started():
    global _in_flight
    _in_flight += 1
    touch()


def request_finished():
    global _in_flight
    _in_flight -= 1


def _unload_ollama():
    """Best-effort: ask Ollama to unload every loaded model right away."""
    try:
        with urllib.request.urlopen(OLLAMA_HOST + "/api/ps", timeout=5) as r:
            data = json.loads(r.read())
        for model in data.get("models", []):
            name = model.get("name") or model.get("model")
            if not name:
                continue
            body = json.dumps({
                "model": name,
                "messages": [{"role": "user", "content": "."}],
                "stream": False,
                "keep_alive": 0,
            }).encode()
            req = urllib.request.Request(
                OLLAMA_HOST + "/api/chat",
                data=body,
                headers={"Content-Type": "application/json"},
            )
            try:
                urllib.request.urlopen(req, timeout=10)
            except Exception:
                pass
    except Exception:
        pass  # Ollama not running or unreachable; nothing to unload


def shutdown_all():
    """Unload Ollama models and kill this process (releases Whisper/TTS)."""
    global _shutdown_started
    if not _shutdown_started:
        _shutdown_started = True
    print("[shutdown] Web app closed/idle: unloading Ollama models and exiting.", flush=True)
    _unload_ollama()
    os._exit(0)


def _watchdog():
    while True:
        time.sleep(15)
        if _shutdown_started:
            return
        idle_for = time.monotonic() - _last_activity
        if IDLE_TIMEOUT > 0 and idle_for > IDLE_TIMEOUT and _in_flight == 0:
            print(f"[watchdog] No activity for {idle_for:.0f}s -> shutting down.", flush=True)
            shutdown_all()


def start_watchdog():
    threading.Thread(target=_watchdog, daemon=True, name="idle-watchdog").start()
