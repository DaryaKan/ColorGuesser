import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "game.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL,
                score INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


async def add_score(nickname: str, score: int) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO leaderboard (nickname, score) VALUES (?, ?)",
            (nickname, score),
        )
        await db.commit()
        return cursor.lastrowid


async def get_leaderboard(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT nickname, score FROM leaderboard ORDER BY score DESC, created_at ASC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()

    entries = []
    current_rank = 0
    prev_score = None
    for i, row in enumerate(rows):
        if row["score"] != prev_score:
            current_rank = i + 1
            prev_score = row["score"]
        entries.append({
            "rank": current_rank,
            "nickname": row["nickname"],
            "score": row["score"],
        })
    return entries
