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
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    logger.info("Server started in background")

    if not BOT_TOKEN or not WEBAPP_URL:
        logger.warning(
            "BOT_TOKEN or WEBAPP_URL not set — bot will NOT start. "
            "Set both in Railway Variables for /start to work."
        )
        import time
        while True:
            time.sleep(3600)
    else:
        start_bot()
