from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .database import activate_score, add_score, get_leaderboard, get_round_percentile, get_scores_by_nickname, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)

class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        if request.url.path.endswith((".html", ".js", ".css")):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response

app.add_middleware(NoCacheStaticMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreSubmission(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=64)
    score: int = Field(..., ge=0, le=400)
    is_active: bool = True


@app.get("/api/scores/{nickname}")
async def get_user_scores(nickname: str):
    scores = await get_scores_by_nickname(nickname)
    return {"scores": scores}


@app.post("/api/score")
async def submit_score(data: ScoreSubmission):
    entry_id = await add_score(data.nickname, data.score, data.is_active)
    return {"ok": True, "id": entry_id}


class ScoreActivate(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=64)
    score_id: int


@app.put("/api/score/activate")
async def activate_user_score(data: ScoreActivate):
    ok = await activate_score(data.nickname, data.score_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Score not found")
    return {"ok": True}


@app.get("/api/percentile/{score}")
async def percentile(score: int):
    pct = await get_round_percentile(score)
    return {"percentile": pct}


@app.get("/api/leaderboard")
async def leaderboard():
    entries = await get_leaderboard()
    return {"entries": entries}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
