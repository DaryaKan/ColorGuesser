import os
import logging

from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if WEBAPP_URL:
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton(
                text="🎨 Play",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )]
        ])
        await update.message.reply_text(
            "Welcome to Color Guesser Game!\nGuess the color on the color wheel. 4 rounds, max 400 points.\n\nTap the button below to play:",
            reply_markup=keyboard,
        )
    else:
        await update.message.reply_text(
            "Welcome to Color Guesser Game!\nThe game is being set up. Please try again later.",
        )


async def post_init(application: Application) -> None:
    try:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Играть",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        )
        logger.info("Menu button configured")
    except Exception as e:
        logger.error("Failed to set menu button: %s", e)


def main():
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN environment variable is required")
    if not WEBAPP_URL:
        raise RuntimeError("WEBAPP_URL environment variable is required")

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .build()
    )
    app.add_handler(CommandHandler("start", start))

    logger.info("Bot starting...")
    app.run_polling()


if __name__ == "__main__":
    main()
