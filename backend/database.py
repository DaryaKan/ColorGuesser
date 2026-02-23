import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "game.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL,
                score INTEGER NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


async def add_score(nickname: str, score: int, is_active: bool = True) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        if is_active:
            await db.execute(
                "UPDATE scores SET is_active = 0 WHERE nickname = ?",
                (nickname,),
            )
        cursor = await db.execute(
            "INSERT INTO scores (nickname, score, is_active) VALUES (?, ?, ?)",
            (nickname, score, 1 if is_active else 0),
        )
        await db.commit()
        return cursor.lastrowid


async def get_scores_by_nickname(nickname: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, score, is_active, created_at FROM scores WHERE nickname = ? ORDER BY created_at DESC",
            (nickname,),
        )
        rows = await cursor.fetchall()
    return [{
        "id": row["id"],
        "score": row["score"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    } for row in rows]


async def activate_score(nickname: str, score_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        check = await db.execute(
            "SELECT id FROM scores WHERE id = ? AND nickname = ?",
            (score_id, nickname),
        )
        if not await check.fetchone():
            return False
        await db.execute(
            "UPDATE scores SET is_active = 0 WHERE nickname = ?",
            (nickname,),
        )
        await db.execute(
            "UPDATE scores SET is_active = 1 WHERE id = ? AND nickname = ?",
            (score_id, nickname),
        )
        await db.commit()
        return True


async def get_round_percentile(round_score: int, total_rounds: int = 4) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT score FROM scores")
        rows = await cursor.fetchall()

    if not rows:
        return 100

    below = sum(1 for (total,) in rows if total / total_rounds < round_score)
    return round(below / len(rows) * 100)


async def get_leaderboard(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT nickname, score FROM scores WHERE is_active = 1 ORDER BY score DESC, created_at ASC LIMIT ?",
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
