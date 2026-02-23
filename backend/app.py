from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .database import add_score, get_leaderboard, get_scores_by_nickname, init_db, replace_score


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreSubmission(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=64)
    score: int = Field(..., ge=0, le=400)


@app.get("/api/scores/{nickname}")
async def get_user_scores(nickname: str):
    scores = await get_scores_by_nickname(nickname)
    return {"scores": scores}


@app.post("/api/score")
async def submit_score(data: ScoreSubmission):
    entry_id = await add_score(data.nickname, data.score)
    return {"ok": True, "id": entry_id}


class ScoreReplace(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=64)
    score: int = Field(..., ge=0, le=400)


@app.put("/api/score")
async def replace_user_score(data: ScoreReplace):
    entry_id = await replace_score(data.nickname, data.score)
    return {"ok": True, "id": entry_id}


@app.get("/api/leaderboard")
async def leaderboard():
    entries = await get_leaderboard()
    return {"entries": entries}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
