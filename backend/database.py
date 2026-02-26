import os

DATABASE_URL = os.getenv("DATABASE_URL", "")
USE_PG = DATABASE_URL.startswith("postgres")

if USE_PG:
    import asyncpg

    _pool = None

    async def _get_pool():
        global _pool
        if _pool is None:
            url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
            _pool = await asyncpg.create_pool(url)
        return _pool

    async def init_db():
        pool = await _get_pool()
        async with pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS scores (
                    id SERIAL PRIMARY KEY,
                    nickname TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)

    async def add_score(nickname: str, score: int, is_active: bool = True) -> int:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                if is_active:
                    await conn.execute(
                        "UPDATE scores SET is_active = FALSE WHERE nickname = $1", nickname
                    )
                row = await conn.fetchrow(
                    "INSERT INTO scores (nickname, score, is_active) VALUES ($1, $2, $3) RETURNING id",
                    nickname, score, is_active,
                )
                return row["id"]

    async def get_scores_by_nickname(nickname: str) -> list[dict]:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, score, is_active, created_at FROM scores WHERE nickname = $1 ORDER BY created_at DESC",
                nickname,
            )
        return [{"id": r["id"], "score": r["score"], "is_active": r["is_active"], "created_at": str(r["created_at"])} for r in rows]

    async def activate_score(nickname: str, score_id: int) -> bool:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            check = await conn.fetchrow(
                "SELECT id FROM scores WHERE id = $1 AND nickname = $2", score_id, nickname
            )
            if not check:
                return False
            async with conn.transaction():
                await conn.execute("UPDATE scores SET is_active = FALSE WHERE nickname = $1", nickname)
                await conn.execute("UPDATE scores SET is_active = TRUE WHERE id = $1 AND nickname = $2", score_id, nickname)
            return True

    async def deactivate_all(nickname: str) -> bool:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute("UPDATE scores SET is_active = FALSE WHERE nickname = $1", nickname)
            return "UPDATE" in result

    async def get_round_percentile(round_score: int, total_rounds: int = 4) -> int:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT score FROM scores")
        if not rows:
            return 100
        below = sum(1 for r in rows if r["score"] / total_rounds < round_score)
        return round(below / len(rows) * 100)

    async def get_leaderboard(limit: int = 50) -> list[dict]:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT nickname, score FROM scores WHERE is_active = TRUE ORDER BY score DESC, created_at ASC LIMIT $1",
                limit,
            )
        entries = []
        current_rank = 0
        prev_score = None
        for i, r in enumerate(rows):
            if r["score"] != prev_score:
                current_rank = i + 1
                prev_score = r["score"]
            entries.append({"rank": current_rank, "nickname": r["nickname"], "score": r["score"]})
        return entries

    async def get_stats() -> dict:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            total_players = await conn.fetchval(
                "SELECT COUNT(DISTINCT nickname) FROM scores WHERE is_active = TRUE"
            )
            total_games = await conn.fetchval("SELECT COUNT(*) FROM scores")
        return {"total_players": total_players or 0, "total_games": total_games or 0}

else:
    import aiosqlite

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
                await db.execute("UPDATE scores SET is_active = 0 WHERE nickname = ?", (nickname,))
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
        return [{"id": r["id"], "score": r["score"], "is_active": bool(r["is_active"]), "created_at": r["created_at"]} for r in rows]

    async def activate_score(nickname: str, score_id: int) -> bool:
        async with aiosqlite.connect(DB_PATH) as db:
            check = await db.execute("SELECT id FROM scores WHERE id = ? AND nickname = ?", (score_id, nickname))
            if not await check.fetchone():
                return False
            await db.execute("UPDATE scores SET is_active = 0 WHERE nickname = ?", (nickname,))
            await db.execute("UPDATE scores SET is_active = 1 WHERE id = ? AND nickname = ?", (score_id, nickname))
            await db.commit()
            return True

    async def deactivate_all(nickname: str) -> bool:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("UPDATE scores SET is_active = 0 WHERE nickname = ?", (nickname,))
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
        for i, r in enumerate(rows):
            if r["score"] != prev_score:
                current_rank = i + 1
                prev_score = r["score"]
            entries.append({"rank": current_rank, "nickname": r["nickname"], "score": r["score"]})
        return entries

    async def get_stats() -> dict:
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute(
                "SELECT COUNT(DISTINCT nickname) FROM scores WHERE is_active = 1"
            )
            total_players = (await cursor.fetchone())[0]
            cursor = await db.execute("SELECT COUNT(*) FROM scores")
            total_games = (await cursor.fetchone())[0]
        return {"total_players": total_players, "total_games": total_games}
