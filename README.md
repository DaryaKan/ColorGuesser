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
└── requirements.txt
```

## Установка

```bash
pip install -r requirements.txt
```

## Запуск

### 1. Веб-сервер (API + фронтенд)

```bash
uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

Фронтенд будет доступен на `http://localhost:8000`.

### 2. Telegram-бот

Необходимо задать переменные окружения:

- `BOT_TOKEN` — токен бота от [@BotFather](https://t.me/BotFather)
- `WEBAPP_URL` — публичный HTTPS URL, на котором размещён фронтенд

```bash
export BOT_TOKEN="123456:ABC-DEF..."
export WEBAPP_URL="https://your-domain.com"
python -m backend.bot
```

### Для разработки (с HTTPS через ngrok)

```bash
# В первом терминале:
uvicorn backend.app:app --host 0.0.0.0 --port 8000

# Во втором терминале:
ngrok http 8000

# Скопируйте HTTPS URL из ngrok и задайте его в WEBAPP_URL
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
