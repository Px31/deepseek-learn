@echo off
echo Starting DeepSeek Learn...

:: Start Ollama
start /B ollama serve
timeout /t 2 /nobreak > NUL

:: Start Backend
cd backend
call venv\Scripts\activate
start /B python app/main.py
cd ..

:: Start Frontend
cd frontend
start /B npm run dev
cd ..

echo --------------------------------------------------------
echo DeepSeek Learn is running!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8888
echo --------------------------------------------------------
pause
