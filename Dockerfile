FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Веб + бот в одном контейнере: run.py поднимает uvicorn и бота. Нужны BOT_TOKEN, WEBAPP_URL, PORT.
CMD ["sh", "-c", "python run.py"]
