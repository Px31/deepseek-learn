@echo off
echo Starting DeepSeek Learn Setup...

:: Check Prerequisites
where python >nul 2>nul
if %errorlevel% neq 0 ( echo Python is required. & pause & exit /b )
where node >nul 2>nul
if %errorlevel% neq 0 ( echo Node.js is required. & pause & exit /b )

:: Backend Setup
echo Setting up Python Backend...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

:: Frontend Setup
echo Setting up React Frontend...
cd frontend
call npm install
cd ..

:: Pull Ollama Models
echo Pulling AI Models...
ollama pull llama3
ollama pull nomic-embed-text

echo Setup Complete! Run start.bat to launch.
pause
