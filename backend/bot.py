import os
import asyncio
import logging

from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton(
            text="🎨 Играть",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )]
    ])
    await update.message.reply_text(
        "Привет! Нажми кнопку ниже, чтобы начать игру «Угадай цвет».",
        reply_markup=keyboard,
    )


def main():
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN environment variable is required")
    if not WEBAPP_URL:
        raise RuntimeError("WEBAPP_URL environment variable is required")

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))

    logger.info("Bot started")
    app.run_polling()


if __name__ == "__main__":
    main()
