from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import re
import hmac
import json
import time
import logging
import uuid
import asyncio
from html import escape
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone, timedelta, date
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from news import get_news
from email_service import send_email

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


def _names(items):
    return [x["name"] for x in items or []]


def _pc_requirements(detail):
    return next((p.get("requirements") for p in detail.get("platforms") or []
                 if p["platform"]["slug"] == "pc" and p.get("requirements")), None)


def _stores(detail, stores):
    urls = {} if isinstance(stores, Exception) else {s["id"]: s["url"] for s in stores.get("results", [])}
    return [{"name": s["store"]["name"], "url": urls.get(s["id"]) or f"https://{s['store']['domain']}"}
            for s in detail.get("stores") or []]


def _screenshots(shots):
    return [] if isinstance(shots, Exception) else [s["image"] for s in shots.get("results", [])]


def _trailers(movies):
    if isinstance(movies, Exception):
        return []
    out = []
    for m in movies.get("results", []):
        data = m.get("data") or {}
        out.append({"name": m["name"], "preview": m.get("preview"), "video": data.get("max") or data.get("480")})
    return out


def format_detail(detail, shots, movies, stores):
    base = slim(detail)
    base.update({
        "description": detail.get("description_raw") or "",
        "website": detail.get("website"),
        "developers": _names(detail.get("developers")),
        "publishers": _names(detail.get("publishers")),
        "tags": [t["name"] for t in (detail.get("tags") or []) if t.get("language") == "eng"][:12],
        "esrb": (detail.get("esrb_rating") or {}).get("name"),
        "background_image_additional": detail.get("background_image_additional"),
        "requirements": _pc_requirements(detail),
        "stores": _stores(detail, stores),
        "screenshots": _screenshots(shots),
        "trailers": _trailers(movies),
    })
    return base


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
    return format_detail(detail, shots, movies, stores)


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


# ---------- News ----------
@api.get("/news")
async def news(platform: Optional[str] = None, category: Optional[str] = None, limit: int = 60):
    items = await get_news()
    if platform and platform != "all":
        items = [i for i in items if platform in i["platforms"]]
    if category and category != "all":
        items = [i for i in items if i["category"] == category]
    return items[:limit]


# ---------- Reviews ----------
class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(max_length=2000)

    @field_validator("text")
    @classmethod
    def strip_text(cls, v):
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Review must be at least 3 characters")
        return v


@api.get("/games/{game_id}/reviews")
async def get_reviews(game_id: int):
    items = await db.reviews.find({"game_id": game_id}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    avg = round(sum(r["rating"] for r in items) / len(items), 2) if items else None
    return {"count": len(items), "average": avg, "reviews": items}


@api.post("/games/{game_id}/reviews")
async def upsert_review(game_id: int, body: ReviewIn, request: Request):
    user = await current_user(request)
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.reviews.find_one({"game_id": game_id, "user_id": user["user_id"]}, {"_id": 0})
    doc = {"game_id": game_id, "user_id": user["user_id"], "user_name": user["name"], "user_picture": user.get("picture"),
           "rating": body.rating, "text": body.text.strip(), "updated_at": now,
           "review_id": existing["review_id"] if existing else f"rev_{uuid.uuid4().hex[:12]}",
           "created_at": existing["created_at"] if existing else now}
    await db.reviews.update_one({"game_id": game_id, "user_id": user["user_id"]}, {"$set": doc}, upsert=True)
    return doc


@api.delete("/games/{game_id}/reviews")
async def delete_review(game_id: int, request: Request):
    user = await current_user(request)
    await db.reviews.delete_one({"game_id": game_id, "user_id": user["user_id"]})
    return {"ok": True}


# ---------- PC prices (CheapShark) ----------
CHEAPSHARK = "https://www.cheapshark.com/api/1.0"
CS_HEADERS = {"User-Agent": "GameRadar/1.0 (game info hub)"}


async def cheapshark(path: str, params: dict):
    key = "cs" + path + json.dumps(params, sort_keys=True)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return hit[1]
    r = await http.get(f"{CHEAPSHARK}{path}", params=params, headers=CS_HEADERS)
    r.raise_for_status()
    data = r.json()
    _cache[key] = (time.time(), data)
    return data


@api.get("/games/{game_id}/price")
async def game_price(game_id: str):
    detail = await rawg(f"/games/{game_id}")
    name = detail.get("name", "")
    try:
        matches = await cheapshark("/games", {"title": name, "limit": 10})
        if not matches:
            return {"available": False}
        norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
        match = next((m for m in matches if norm(m["external"]) == norm(name)), None)
        if not match:
            return {"available": False}
        info, stores = await asyncio.gather(cheapshark("/games", {"id": match["gameID"]}), cheapshark("/stores", {}))
        store_names = {s["storeID"]: s["storeName"] for s in stores}
        deals = sorted(info.get("deals", []), key=lambda d: float(d["price"]))
        if not deals:
            return {"available": False}
        best = deals[0]
        return {
            "available": True, "title": match["external"], "price": float(best["price"]),
            "retail": float(best["retailPrice"]), "savings": round(float(best["savings"])),
            "store": store_names.get(best["storeID"], "PC store"),
            "url": f"https://www.cheapshark.com/redirect?dealID={best['dealID']}",
            "cheapest_ever": float((info.get("cheapestPriceEver") or {}).get("price") or 0) or None,
            "deals": [{"store": store_names.get(d["storeID"], "Store"), "price": float(d["price"]),
                       "url": f"https://www.cheapshark.com/redirect?dealID={d['dealID']}"} for d in deals[:5]],
        }
    except httpx.HTTPError:
        return {"available": False}


# ---------- Release reminders ----------
class ReminderPref(BaseModel):
    enabled: bool


@api.get("/me/reminders")
async def get_reminders(request: Request):
    user = await current_user(request)
    return {"enabled": user.get("reminders_enabled", True), "email": user["email"]}


@api.put("/me/reminders")
async def set_reminders(body: ReminderPref, request: Request):
    user = await current_user(request)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"reminders_enabled": body.enabled}})
    return {"enabled": body.enabled}


def reminder_html(name: str, games: list):
    rows = "".join(
        f'<tr><td style="padding:10px 0;border-bottom:1px solid #222;font-size:16px;color:#f8fafc">'
        f'<strong>{escape(g["name"])}</strong><br><span style="font-size:12px;color:#94a3b8">'
        f'{escape(", ".join(g.get("platforms", [])[:5]))}</span></td></tr>' for g in games)
    return (f'<table role="presentation" width="100%" style="background:#08090c"><tr><td style="padding:28px;'
            f'font-family:Arial,sans-serif;color:#f8fafc">'
            f'<p style="font-size:12px;letter-spacing:3px;color:#ff9f1c;margin:0">GAMERADAR · RELEASE DAY</p>'
            f'<p style="font-size:16px">Hi {escape(name)}, good news — a game on your wishlist is out today:</p>'
            f'<table role="presentation" width="100%">{rows}</table>'
            f'<p style="font-size:14px;color:#cbd5e1">Open GameRadar to see trailers, reviews and the best PC price.</p>'
            f'<p style="font-size:11px;color:#64748b">Sent by {escape(os.environ["EMAIL_FROM_NAME"])} because you turned on '
            f'release reminders. You can switch them off on your Wishlist page. We never ask for your password or card details by email.</p>'
            f'</td></tr></table>')


async def refresh_release_dates(today: str):
    lo = (date.today() - timedelta(days=14)).isoformat()
    hi = (date.today() + timedelta(days=14)).isoformat()
    ids = await db.wishlist.distinct("game_id", {"$or": [{"released": {"$gte": lo, "$lte": hi}}, {"released": None}]})
    sem = asyncio.Semaphore(5)

    async def refresh(gid):
        async with sem:
            try:
                d = await rawg(f"/games/{gid}")
            except HTTPException:
                return
        if d.get("released"):
            await db.wishlist.update_many({"game_id": gid}, {"$set": {"released": d["released"]}})

    await asyncio.gather(*(refresh(g) for g in ids))


async def run_release_reminders(run_id: str):
    try:
        sent = await _send_reminders(run_id)
        await db.cron_runs.update_one({"run_id": run_id}, {"$set": {"status": "done", "emails_sent": sent}})
    except Exception as e:
        logging.exception("Reminder run failed")
        await db.cron_runs.update_one({"run_id": run_id}, {"$set": {"status": "failed", "error": str(e)}})


async def _send_reminders(run_id: str):
    today = date.today().isoformat()
    await refresh_release_dates(today)
    items = await db.wishlist.find({"released": today}, {"_id": 0}).to_list(5000)
    by_user: dict = {}
    for it in items:
        by_user.setdefault(it["user_id"], []).append(it)
    sent = 0
    for user_id, games in by_user.items():
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user or user.get("reminders_enabled", True) is False:
            continue
        claimed = []
        for g in games:
            try:
                await db.reminders_sent.insert_one({"user_id": user_id, "game_id": g["game_id"], "run_id": run_id,
                                                    "sent_at": datetime.now(timezone.utc).isoformat()})
                claimed.append(g)
            except DuplicateKeyError:
                pass
        if not claimed:
            continue
        subject = f"Out today: {claimed[0]['name']}" + (f" + {len(claimed) - 1} more" if len(claimed) > 1 else "")
        try:
            await send_email(to=user["email"], subject=subject, html=reminder_html(user["name"], claimed))
            sent += 1
        except Exception:
            logging.exception("Reminder email failed")
            await db.reminders_sent.delete_many({"user_id": user_id, "run_id": run_id})
    return sent


@app.on_event("startup")
async def startup():
    await db.reminders_sent.create_index([("user_id", 1), ("game_id", 1)], unique=True)
    await db.cron_runs.create_index("run_id", unique=True)


@api.post("/cron/release-reminders")
async def cron_release_reminders(request: Request, background: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or not hmac.compare_digest(auth[7:], os.environ["WEBHOOK_CRON_SECRET"]):
        raise HTTPException(401, "Unauthorized")
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        raise HTTPException(400, "Invalid body")
    run_id = request.headers.get("X-Webhook-Id") or body.get("run_id") or f"manual_{uuid.uuid4().hex[:8]}"
    if await db.cron_runs.find_one({"run_id": run_id}):
        return {"status": "duplicate"}
    try:
        await db.cron_runs.insert_one({"run_id": run_id, "job": "release-reminders", "status": "queued",
                                       "created_at": datetime.now(timezone.utc).isoformat()})
    except DuplicateKeyError:
        return {"status": "duplicate"}
    background.add_task(run_release_reminders, run_id)
    return {"status": "accepted", "run_id": run_id}


# ---------- Contact ----------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=200)
    subject: str = Field(default="General", max_length=60)
    message: str = Field(min_length=10, max_length=5000)

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        v = v.strip()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email")
        return v


@api.post("/contact")
async def contact(body: ContactIn, request: Request):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    if await db.contact_messages.count_documents({"ip": ip, "created_at": {"$gte": since}}) >= 5:
        raise HTTPException(429, "Too many messages — please try again later.")
    await db.contact_messages.insert_one({**body.model_dump(), "ip": ip, "status": "new",
                                          "created_at": datetime.now(timezone.utc).isoformat()})
    return {"ok": True}


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
