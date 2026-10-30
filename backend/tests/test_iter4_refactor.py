# Iteration 4: refactor regression - game detail shape + email guard helpers
import os
import sys
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
sys.path.insert(0, "/app/backend")


# ---------- GET /api/games/{id} shape ----------
@pytest.mark.parametrize("gid", [3498, 41494])
def test_game_detail_shape(gid):
    r = requests.get(f"{API}/games/{gid}", timeout=60)
    assert r.status_code == 200
    d = r.json()
    for k in ["id", "name", "genres", "platforms", "description", "developers", "publishers", "tags",
              "requirements", "stores", "screenshots", "trailers", "released", "background_image"]:
        assert k in d, k
    assert d["id"] == gid
    assert isinstance(d["screenshots"], list) and d["screenshots"] and all(isinstance(s, str) and s.startswith("http") for s in d["screenshots"])
    assert isinstance(d["stores"], list) and d["stores"]
    assert all("name" in s and "url" in s and s["url"] for s in d["stores"])
    assert isinstance(d["developers"], list) and d["developers"]
    assert isinstance(d["trailers"], list)
    for t in d["trailers"]:
        assert "video" in t
    req = d["requirements"]
    assert req is None or isinstance(req, dict)
    assert "_id" not in d


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
