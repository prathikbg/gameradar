import re
import time
import asyncio
from datetime import datetime, timezone
import feedparser

FEEDS = [
    {"source": "PlayStation Blog", "url": "https://blog.playstation.com/feed/", "platform": "playstation"},
    {"source": "Xbox Wire", "url": "https://news.xbox.com/en-us/feed/", "platform": "xbox"},
    {"source": "IGN", "url": "https://feeds.feedburner.com/ign/games-all", "platform": None},
    {"source": "GameSpot", "url": "https://www.gamespot.com/feeds/game-news/", "platform": None},
    {"source": "PC Gamer", "url": "https://www.pcgamer.com/rss/", "platform": "pc"},
    {"source": "Nintendo Everything", "url": "https://nintendoeverything.com/feed/", "platform": "nintendo"},
    {"source": "My Nintendo News", "url": "https://mynintendonews.com/feed/", "platform": "nintendo"},
]
PLATFORM_WORDS = {
    "playstation": ["ps5", "ps4", "playstation", "dualsense", "state of play", "ps plus"],
    "xbox": ["xbox", "game pass"],
    "nintendo": ["nintendo", "switch", "mario", "zelda", "pokemon", "pokémon", "kirby"],
    "pc": ["pc", "steam", "epic games store", "nvidia", "amd", "gpu"],
}
CATEGORY_WORDS = {
    "showcase": ["showcase", "direct", "state of play", "summer game fest", "gamescom", "the game awards", "livestream",
                 "presentation", "games show", "tokyo game show", "partner showcase", "everything announced", "event"],
    "patches": ["patch", "patch notes", "update", "hotfix", "season", "dlc", "expansion", "version"],
    "announcements": ["announce", "announced", "announces", "reveal", "revealed", "release date", "trailer", "coming", "launch", "pre-order"],
}
TTL = 1800
_cache = {"t": 0, "items": []}
IMG_RE = re.compile(r'<img[^>]+src="([^"]+)"', re.I)
TAG_RE = re.compile(r"<[^>]+>")


def _has(text, words):
    return any(re.search(rf"\b{re.escape(w)}\b", text) for w in words)


def _image(e):
    for key in ("media_content", "media_thumbnail"):
        for m in e.get(key) or []:
            if m.get("url"):
                return m["url"]
    for enc in e.get("enclosures") or []:
        if (enc.get("type") or "").startswith("image") and enc.get("href"):
            return enc["href"]
    html = (e.get("content") or [{}])[0].get("value", "") + e.get("summary", "")
    m = IMG_RE.search(html)
    return m.group(1) if m else None


def _parse(feed):
    out = []
    parsed = feedparser.parse(feed["url"], agent="GameRadar/1.0")
    for e in parsed.entries[:25]:
        title = e.get("title", "").strip()
        summary = re.sub(r"\s+", " ", TAG_RE.sub(" ", e.get("summary", ""))).strip()[:280]
        text = f"{title} {summary}".lower()
        platforms = {p for p, w in PLATFORM_WORDS.items() if _has(text, w)}
        if feed["platform"]:
            platforms.add(feed["platform"])
        category = next((c for c, w in CATEGORY_WORDS.items() if _has(title.lower(), w)), "news")
        ts = e.get("published_parsed") or e.get("updated_parsed")
        published = datetime(*ts[:6], tzinfo=timezone.utc).isoformat() if ts else None
        out.append({
            "id": e.get("id") or e.get("link"), "title": title, "summary": summary, "link": e.get("link"),
            "image": _image(e), "source": feed["source"], "published": published,
            "platforms": sorted(platforms), "category": category,
        })
    return out


async def get_news():
    if time.time() - _cache["t"] < TTL and _cache["items"]:
        return _cache["items"]
    results = await asyncio.gather(*[asyncio.to_thread(_parse, f) for f in FEEDS], return_exceptions=True)
    items = [i for r in results if not isinstance(r, Exception) for i in r if i["link"]]
    items.sort(key=lambda i: i["published"] or "", reverse=True)
    if items:
        _cache.update(t=time.time(), items=items)
    return items
