from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import time
import logging
import uuid
import asyncio
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta, date
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

RAWG_BASE = "https://api.rawg.io/api"
AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
PLATFORMS = {"ps5": "187", "xbox": "186", "pc": "4", "switch": "7", "ps4": "18", "xboxone": "1"}

app = FastAPI()
api = APIRouter(prefix="/api")
http = httpx.AsyncClient(timeout=20)
_cache: dict = {}
CACHE_TTL = 900


async def rawg(path: str, params: Optional[dict] = None):
    params = {k: v for k, v in (params or {}).items() if v not in (None, "")}
    key = path + json.dumps(params, sort_keys=True)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return hit[1]
    api_key = os.environ.get("RAWG_API_KEY")
    if not api_key:
        raise HTTPException(503, "RAWG API key not configured")
    r = await http.get(f"{RAWG_BASE}{path}", params={**params, "key": api_key})
    if r.status_code == 404:
        raise HTTPException(404, "Not found")
    if r.status_code != 200:
        raise HTTPException(502, f"Game data provider error ({r.status_code})")
    data = r.json()
    _cache[key] = (time.time(), data)
    return data


def platform_param(platform: Optional[str]):
    if not platform or platform == "all":
        return None
    return PLATFORMS.get(platform, platform)


def date_range(days_back: int = 0, days_fwd: int = 0):
    today = date.today()
    return f"{today - timedelta(days=days_back)},{today + timedelta(days=days_fwd)}"


def slim(g: dict):
    return {
        "id": g.get("id"), "slug": g.get("slug"), "name": g.get("name"),
        "released": g.get("released"), "background_image": g.get("background_image"),
        "rating": g.get("rating"), "ratings_count": g.get("ratings_count"),
        "metacritic": g.get("metacritic"), "added": g.get("added"),
        "playtime": g.get("playtime"), "tba": g.get("tba"),
        "platforms": [p["platform"]["name"] for p in (g.get("platforms") or []) if p.get("platform")],
        "genres": [x["name"] for x in (g.get("genres") or [])],
        "short_screenshots": [s["image"] for s in (g.get("short_screenshots") or [])][:6],
    }


def page(data: dict):
    return {"count": data.get("count", 0), "next": bool(data.get("next")),
            "results": [slim(g) for g in data.get("results", [])]}


# ---------- Games ----------
@api.get("/")
async def root():
    return {"message": "GameRadar API"}


@api.get("/games")
async def games(search: Optional[str] = None, platform: Optional[str] = None, genre: Optional[str] = None,
                ordering: Optional[str] = None, dates: Optional[str] = None, page_num: int = 1, page_size: int = 20):
    data = await rawg("/games", {"search": search, "platforms": platform_param(platform), "genres": genre,
                                 "ordering": ordering, "dates": dates, "page": page_num,
                                 "page_size": min(page_size, 40)})
    return page(data)


@api.get("/games/new")
async def new_releases(platform: Optional[str] = None, ordering: str = "-added", page_num: int = 1):
    data = await rawg("/games", {"dates": date_range(days_back=90), "platforms": platform_param(platform),
                                 "ordering": ordering, "page": page_num, "page_size": 24})
    return page(data)


@api.get("/games/charts")
async def charts(kind: str = "trending", platform: Optional[str] = None):
    if kind == "alltime":
        params = {"ordering": "-added"}
    elif kind == "toprated":
        data = await rawg("/games", {"ordering": "-added", "dates": date_range(days_back=365),
                                     "platforms": platform_param(platform), "page_size": 40})
        res = page(data)
        res["results"] = sorted([g for g in res["results"] if (g["ratings_count"] or 0) >= 5],
                                key=lambda g: -(g["rating"] or 0))[:20]
        return res
    else:
        params = {"ordering": "-added", "dates": date_range(days_back=180)}
    data = await rawg("/games", {**params, "platforms": platform_param(platform), "page_size": 20})
    return page(data)


@api.get("/games/upcoming")
async def upcoming(platform: Optional[str] = None, page_num: int = 1):
    data = await rawg("/games", {"dates": date_range(days_back=-1, days_fwd=365), "platforms": platform_param(platform),
                                 "ordering": "-added", "page": page_num, "page_size": 40})
    res = page(data)
    res["results"].sort(key=lambda g: g.get("released") or "9999")
    return res


@api.get("/genres")
async def genres():
    data = await rawg("/genres", {"page_size": 20})
    return [{"id": g["id"], "slug": g["slug"], "name": g["name"]} for g in data.get("results", [])]


@api.get("/games/{game_id}")
async def game_detail(game_id: str):
    detail, shots, movies, stores = await asyncio.gather(
        rawg(f"/games/{game_id}"),
        rawg(f"/games/{game_id}/screenshots"),
        rawg(f"/games/{game_id}/movies"),
        rawg(f"/games/{game_id}/stores"),
        return_exceptions=True,
    )
    if isinstance(detail, Exception):
        raise detail
    store_urls = {} if isinstance(stores, Exception) else {s["id"]: s["url"] for s in stores.get("results", [])}
    base = slim(detail)
    base.update({
        "description": detail.get("description_raw") or "",
        "website": detail.get("website"),
        "developers": [d["name"] for d in detail.get("developers") or []],
        "publishers": [p["name"] for p in detail.get("publishers") or []],
        "tags": [t["name"] for t in (detail.get("tags") or []) if t.get("language") == "eng"][:12],
        "esrb": (detail.get("esrb_rating") or {}).get("name"),
        "background_image_additional": detail.get("background_image_additional"),
        "requirements": next((p.get("requirements") for p in detail.get("platforms") or []
                              if p["platform"]["slug"] == "pc" and p.get("requirements")), None),
        "stores": [{"name": s["store"]["name"], "url": store_urls.get(s["id"]) or f"https://{s['store']['domain']}"}
                   for s in detail.get("stores") or []],
        "screenshots": [] if isinstance(shots, Exception) else [s["image"] for s in shots.get("results", [])],
        "trailers": [] if isinstance(movies, Exception) else [
            {"name": m["name"], "preview": m.get("preview"), "video": (m.get("data") or {}).get("max") or (m.get("data") or {}).get("480")}
            for m in movies.get("results", [])],
    })
    return base


# ---------- Auth ----------
async def current_user(request: Request, required: bool = True):
    token = request.cookies.get("session_token")
    auth = request.headers.get("Authorization", "")
    if not token and auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        if required:
            raise HTTPException(401, "Not authenticated")
        return None
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        if required:
            raise HTTPException(401, "Invalid session")
        return None
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        if required:
            raise HTTPException(401, "Session expired")
        return None
    return await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})


class SessionIn(BaseModel):
    session_id: str


@api.post("/auth/session")
async def create_session(body: SessionIn, response: Response):
    r = await http.get(AUTH_SESSION_URL, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session id")
    d = r.json()
    existing = await db.users.find_one({"email": d["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": d["name"], "picture": d.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({"user_id": user_id, "email": d["email"], "name": d["name"],
                                   "picture": d.get("picture"), "created_at": datetime.now(timezone.utc).isoformat()})
    await db.user_sessions.insert_one({"user_id": user_id, "session_token": d["session_token"],
                                       "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                                       "created_at": datetime.now(timezone.utc)})
    response.set_cookie("session_token", d["session_token"], httponly=True, secure=True, samesite="none",
                        path="/", max_age=7 * 24 * 3600)
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


@api.get("/auth/me")
async def me(request: Request):
    return await current_user(request)


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    auth = request.headers.get("Authorization", "")
    if not token and auth.startswith("Bearer "):
        token = auth[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"ok": True}


# ---------- Wishlist ----------
class WishItem(BaseModel):
    game_id: int
    name: str
    slug: Optional[str] = None
    background_image: Optional[str] = None
    released: Optional[str] = None
    rating: Optional[float] = None
    metacritic: Optional[int] = None
    platforms: List[str] = []
    genres: List[str] = []


@api.get("/wishlist")
async def get_wishlist(request: Request):
    user = await current_user(request)
    return await db.wishlist.find({"user_id": user["user_id"]}, {"_id": 0}).sort("added_at", -1).to_list(500)


@api.post("/wishlist")
async def add_wishlist(item: WishItem, request: Request):
    user = await current_user(request)
    doc = {**item.model_dump(), "user_id": user["user_id"], "added_at": datetime.now(timezone.utc).isoformat()}
    await db.wishlist.update_one({"user_id": user["user_id"], "game_id": item.game_id}, {"$set": doc}, upsert=True)
    return {"ok": True}


@api.delete("/wishlist/{game_id}")
async def remove_wishlist(game_id: int, request: Request):
    user = await current_user(request)
    await db.wishlist.delete_one({"user_id": user["user_id"], "game_id": game_id})
    return {"ok": True}


# ---------- AI Guide ----------
SYSTEM_PROMPT = (
    "You are Radar AI, the expert game guide of GameRadar, a hub for gamers. You know PS5, Xbox, PC, Switch "
    "and mobile games: new releases, upcoming titles, recommendations, walkthrough tips, boss strategies, "
    "lore, system requirements and comparisons. Be concise, friendly and use short markdown lists when helpful. "
    f"Today's date is {date.today().isoformat()}. If unsure about very recent facts, say so."
)


class ChatIn(BaseModel):
    session_id: str
    message: str


@api.get("/ai/history/{session_id}")
async def ai_history(session_id: str):
    return await db.ai_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(200)


@api.post("/ai/chat")
async def ai_chat(body: ChatIn):
    history = await db.ai_messages.find({"session_id": body.session_id}, {"_id": 0}).sort("created_at", 1).to_list(30)
    context = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-12:])
    prompt = f"Conversation so far:\n{context}\n\nUSER: {body.message}" if context else body.message
    await db.ai_messages.insert_one({"session_id": body.session_id, "role": "user", "content": body.message,
                                     "created_at": datetime.now(timezone.utc).isoformat()})
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"{body.session_id}-{uuid.uuid4().hex[:6]}",
                   system_message=SYSTEM_PROMPT).with_model("anthropic", "claude-sonnet-5-5")

    async def gen():
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logging.exception("AI error")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        if full:
            await db.ai_messages.insert_one({"session_id": body.session_id, "role": "assistant", "content": full,
                                             "created_at": datetime.now(timezone.utc).isoformat()})
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown():
    client.close()
    await http.aclose()
