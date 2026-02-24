# Угадай цвет — Telegram Mini App

Игра, в которой нужно найти заданный цвет на цветовом круге. 4 раунда, очки суммируются, результат попадает в таблицу рейтинга.

## Структура проекта

```
├── backend/
│   ├── app.py          # FastAPI сервер (API + статика)
│   ├── bot.py          # Telegram-бот с кнопкой запуска Mini App
│   └── database.py     # SQLite хранилище рейтинга
├── frontend/
│   ├── index.html      # Основная страница Mini App
│   ├── style.css       # Стили (чёрно-белый дизайн)
│   └── game.js         # Логика игры и цветовой круг
├── run.py              # Запуск сервера + бота одним процессом
├── Dockerfile          # Docker-образ для деплоя
├── Procfile            # Для Railway / Heroku
├── railway.toml        # Конфиг Railway
├── render.yaml         # Конфиг Render
└── requirements.txt
```

## Деплой на Railway (рекомендуется)

1. Зайди на [railway.app](https://railway.app) и авторизуйся через GitHub
2. Нажми **New Project → Deploy from GitHub repo**
3. Выбери репозиторий `ColorGuesser`
4. Добавь переменные окружения в Settings → Variables:
   - `BOT_TOKEN` — токен бота от [@BotFather](https://t.me/BotFather)
   - `WEBAPP_URL` — оставь пустым, заполнишь после деплоя
5. Railway задеплоит и даст URL вида `https://xxxxx.up.railway.app`
6. Скопируй этот URL и вставь в переменную `WEBAPP_URL`
7. Railway автоматически передеплоит с правильным URL

## Деплой на Render

1. Зайди на [render.com](https://render.com) и авторизуйся через GitHub
2. Нажми **New → Web Service**
3. Выбери репозиторий, Runtime: **Docker**
4. Добавь переменные окружения:
   - `BOT_TOKEN` — токен бота
   - `WEBAPP_URL` — URL после деплоя (формат `https://xxxxx.onrender.com`)
5. Нажми Deploy

## Локальный запуск

### Установка

```bash
pip install -r requirements.txt
```

### Всё одной командой

```bash
export BOT_TOKEN="ваш_токен"
export WEBAPP_URL="https://ваш-домен.com"
python run.py
```

### Или раздельно

```bash
# Терминал 1 — сервер:
uvicorn backend.app:app --host 0.0.0.0 --port 8000

# Терминал 2 — бот:
export BOT_TOKEN="ваш_токен"
export WEBAPP_URL="https://ваш-домен.com"
python -m backend.bot
```

### Для разработки (с HTTPS через ngrok)

```bash
# Терминал 1:
uvicorn backend.app:app --host 0.0.0.0 --port 8000

# Терминал 2:
ngrok http 8000
# Скопируйте HTTPS URL и задайте:
export WEBAPP_URL="https://xxxx.ngrok-free.app"
export BOT_TOKEN="ваш_токен"
python -m backend.bot
```

## Правила игры

1. Бот показывает кнопку для запуска Mini App
2. На экране отображается цвет-задание и цветовой круг
3. Нужно нажать на цветовой круг, чтобы выбрать максимально похожий цвет
4. Игра оценивает точность от 0 до 100
5. Всего 4 раунда, очки суммируются (максимум 400)
6. После игры вводится ник, результат попадает в рейтинг
7. Игроки с одинаковым результатом занимают одно место
