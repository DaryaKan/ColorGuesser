#!/bin/bash
# Запуск дашборда локально (только сервер, без бота)
cd "$(dirname "$0")"
if ! python3 -c "import uvicorn" 2>/dev/null; then
  echo "Устанавливаю зависимости..."
  pip3 install -r requirements.txt
fi
echo "Запускаю сервер: http://127.0.0.1:8000/dashboard"
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
