import asyncio
import logging
import os
import threading

import uvicorn
from backend.bot import BOT_TOKEN, WEBAPP_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def start_server():
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.app:app", host="0.0.0.0", port=port)


def start_bot():
    from backend.bot import main as bot_main
    bot_main()


if __name__ == "__main__":
    if not BOT_TOKEN:
        raise RuntimeError("Set BOT_TOKEN environment variable")
    if not WEBAPP_URL:
        raise RuntimeError("Set WEBAPP_URL environment variable")

    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    logger.info("Server started in background")

    start_bot()
