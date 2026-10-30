# Iteration 4: refactor regression - game detail shape + email guard helpers
import os
import sys
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
sys.path.insert(0, "/app/backend")


# ---------- GET /api/games/{id} shape ----------
REQUIRED_KEYS = ["id", "name", "genres", "platforms", "description", "developers", "publishers", "tags",
                 "requirements", "stores", "screenshots", "trailers", "released", "background_image"]


@pytest.fixture(scope="module", params=[3498, 41494])
def detail(request):
    r = requests.get(f"{API}/games/{request.param}", timeout=60)
    assert r.status_code == 200
    return request.param, r.json()


def test_game_detail_basic_fields(detail):
    gid, d = detail
    missing = [k for k in REQUIRED_KEYS if k not in d]
    assert not missing, missing
    assert d["id"] == gid
    assert "_id" not in d


def test_game_detail_media(detail):
    shots, trailers = detail[1]["screenshots"], detail[1]["trailers"]
    assert shots and all(isinstance(s, str) and s.startswith("http") for s in shots)
    assert isinstance(trailers, list) and all("video" in t for t in trailers)


def test_game_detail_relationships(detail):
    d = detail[1]
    assert d["stores"] and all(s.get("name") and s.get("url") for s in d["stores"])
    assert isinstance(d["developers"], list) and d["developers"]
    assert d["requirements"] is None or isinstance(d["requirements"], dict)


def test_game_detail_404():
    r = requests.get(f"{API}/games/989999001", timeout=60)
    assert r.status_code == 404


# ---------- email guard helpers ----------
def test_email_guard():
    from email_service import _assert_safe_email
    _assert_safe_email("Out today", '<p>Hi</p><a href="https://rawg.io/games/x">rawg.io</a><img src="https://media.rawg.io/a.jpg">')
    bad = [
        ("s", "<form><input></form>"),
        ("s", "<p>please send your password</p>"),
        ("s", '<a href="http://x.com">x</a>'),
        ("s", '<a href="https://bit.ly/abc">go</a>'),
        ("s", '<a href="https://1.2.3.4/a">go</a>'),
        ("s", '<a href="https://evil.com">paypal.com</a>'),
        ("s", '<a href="https://user:pw@x.com">go</a>'),
    ]
    for subj, html in bad:
        with pytest.raises(ValueError):
            _assert_safe_email(subj, html)
