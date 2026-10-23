#!/bin/bash

# Start Ollama in background
ollama serve &
sleep 2

# Start Backend
cd backend
source venv/bin/activate
python app/main.py &
BACKEND_PID=$!
cd ..

# Start Frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "--------------------------------------------------------"
echo "🟢 DeepSeek Learn is running!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8888"
echo "Press CTRL+C to stop."
echo "--------------------------------------------------------"

# Wait for user to hit Ctrl+C, then kill processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
