import os
import logging

from telegram import BotCommand, Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        if not update or not update.effective_message:
            logger.warning("Start: no message in update")
            return
        if WEBAPP_URL:
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton(
                    text="🎨 Play",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )]
            ])
            await update.effective_message.reply_text(
                "🎨 *Color Guesser Game*\n\n"
                "Guess the right color on the color wheel!\n"
                "• 4 rounds per game\n"
                "• Up to 100 points per round\n"
                "• Max score: 400\n\n"
                "Tap the button below to play 👇",
                reply_markup=keyboard,
                parse_mode="Markdown",
            )
        else:
            await update.effective_message.reply_text(
                "Welcome to Color Guesser Game!\nThe game is being set up. Please try again later.",
            )
    except Exception as e:
        logger.exception("Start handler error: %s", e)
        if update and update.effective_message:
            try:
                await update.effective_message.reply_text("Something went wrong. Try again.")
            except Exception:
                pass


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🎨 *Color Guesser — How to play*\n\n"
        "1️⃣ You see a target color\n"
        "2️⃣ Find it on the color wheel\n"
        "3️⃣ Tap to select, then confirm\n"
        "4️⃣ Repeat for 4 rounds\n\n"
        "The closer your pick, the higher your score (0–100 per round).\n\n"
        "📊 /leaderboard — view top scores\n"
        "🎮 /play — start a new game",
        parse_mode="Markdown",
    )


async def leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{WEBAPP_URL}/api/leaderboard")
            data = res.json()

        entries = data.get("entries", [])
        if not entries:
            await update.message.reply_text("🏆 Leaderboard is empty. Be the first to play!")
            return

        lines = ["🏆 *Leaderboard*\n"]
        for e in entries[:20]:
            medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(e["rank"], f"{e['rank']}.")
            lines.append(f"{medal} *{e['nickname']}* — {e['score']} pts")

        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
    except Exception as err:
        logger.error("Leaderboard fetch error: %s", err)
        await update.message.reply_text("Failed to load leaderboard. Try again later.")


async def play(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if WEBAPP_URL:
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton(
                text="🎨 Play",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )]
        ])
        await update.message.reply_text("Let's go! 👇", reply_markup=keyboard)
    else:
        await update.message.reply_text("Game is not configured yet.")


async def post_init(application: Application) -> None:
    try:
        await application.bot.set_my_commands([
            BotCommand("start", "Start the bot"),
            BotCommand("play", "Play Color Guesser"),
            BotCommand("leaderboard", "View top scores"),
            BotCommand("help", "How to play"),
        ])
        logger.info("Bot commands set")

        if WEBAPP_URL:
            await application.bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="Play",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            )
            logger.info("Menu button configured")
    except Exception as e:
        logger.error("Post-init error: %s", e)


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
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("leaderboard", leaderboard))
    app.add_handler(CommandHandler("play", play))

    logger.info("Bot starting...")
    app.run_polling()


if __name__ == "__main__":
    main()
