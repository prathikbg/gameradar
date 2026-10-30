"""GameRadar backend regression tests: games (RAWG), auth, wishlist, AI chat."""
import os
import json
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def token():
    out = subprocess.run(["mongosh", "test_database", "--quiet", "--eval", """
var t='TEST_sess_'+Date.now(); var u='TEST_user_'+Date.now();
db.users.insertOne({user_id:u,email:u+'@example.com',name:'Test User',picture:'',created_at:new Date()});
db.user_sessions.insertOne({user_id:u,session_token:t,expires_at:new Date(Date.now()+7*864e5),created_at:new Date()});
print(t)"""], capture_output=True, text=True)
    return out.stdout.strip().splitlines()[-1]


@pytest.fixture
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Games ----------
class TestGames:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200 and r.json()["message"] == "GameRadar API"

    def test_games_search(self):
        r = requests.get(f"{API}/games", params={"search": "witcher"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["count"] > 0 and len(d["results"]) > 0
        g = d["results"][0]
        for k in ["id", "name", "platforms", "genres", "background_image"]:
            assert k in g
        assert any("witcher" in x["name"].lower() for x in d["results"])

    @pytest.mark.parametrize("plat", ["all", "ps5", "xbox", "pc", "switch"])
    def test_new_releases(self, plat):
        r = requests.get(f"{API}/games/new", params={"platform": plat}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["results"], list) and len(d["results"]) > 0
        if plat == "ps5":
            assert all("PlayStation 5" in g["platforms"] for g in d["results"])

    def test_new_releases_page2(self):
        r = requests.get(f"{API}/games/new", params={"page_num": 2, "ordering": "-released"}, timeout=30)
        assert r.status_code == 200 and len(r.json()["results"]) > 0

    @pytest.mark.parametrize("kind", ["trending", "alltime", "toprated"])
    def test_charts(self, kind):
        r = requests.get(f"{API}/games/charts", params={"kind": kind}, timeout=30)
        assert r.status_code == 200
        res = r.json()["results"]
        assert len(res) > 0
        if kind == "toprated":
            # now rating-sorted with ratings_count floor
            ratings = [g["rating"] or 0 for g in res]
            assert ratings == sorted(ratings, reverse=True)
            assert all((g["ratings_count"] or 0) >= 5 for g in res)

    def test_charts_toprated_platform(self):
        r = requests.get(f"{API}/games/charts", params={"kind": "toprated", "platform": "pc"}, timeout=30)
        assert r.status_code == 200 and len(r.json()["results"]) > 0


# ---------- Logout via Bearer ----------
class TestLogoutBearer:
    def test_logout_bearer_deletes_session(self):
        out = subprocess.run(["mongosh", "test_database", "--quiet", "--eval", """
var t='TEST_sessL_'+Date.now(); var u='TEST_userL_'+Date.now();
db.users.insertOne({user_id:u,email:u+'@example.com',name:'Test L',picture:'',created_at:new Date()});
db.user_sessions.insertOne({user_id:u,session_token:t,expires_at:new Date(Date.now()+7*864e5),created_at:new Date()});
print(t)"""], capture_output=True, text=True)
        t = out.stdout.strip().splitlines()[-1]
        h = {"Authorization": f"Bearer {t}"}
        assert requests.get(f"{API}/auth/me", headers=h).status_code == 200
        r = requests.post(f"{API}/auth/logout", headers=h)
        assert r.status_code == 200 and r.json()["ok"] is True
        assert requests.get(f"{API}/auth/me", headers=h).status_code == 401
        cnt = subprocess.run(["mongosh", "test_database", "--quiet", "--eval",
                              f"print(db.user_sessions.countDocuments({{session_token:'{t}'}}))"],
                             capture_output=True, text=True).stdout.strip().splitlines()[-1]
        assert cnt == "0"

    def test_upcoming_sorted(self):
        r = requests.get(f"{API}/games/upcoming", timeout=30)
        assert r.status_code == 200
        res = r.json()["results"]
        assert len(res) > 0
        dates = [g["released"] or "9999" for g in res]
        assert dates == sorted(dates)

    def test_genres(self):
        r = requests.get(f"{API}/genres", timeout=30)
        assert r.status_code == 200 and len(r.json()) > 0

    def test_detail(self):
        r = requests.get(f"{API}/games/3498", timeout=40)
        assert r.status_code == 200
        g = r.json()
        assert "Grand Theft Auto" in g["name"]
        assert len(g["screenshots"]) > 0
        assert isinstance(g["stores"], list) and len(g["stores"]) > 0
        assert all(s["url"].startswith("http") for s in g["stores"])
        assert isinstance(g["trailers"], list)
        assert g["description"]

    def test_detail_404(self):
        r = requests.get(f"{API}/games/999999999", timeout=30)
        assert r.status_code == 404


# ---------- Auth & Wishlist ----------
class TestAuthWishlist:
    def test_me_unauth(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_me_invalid(self):
        assert requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer bogus"}).status_code == 401

    def test_me(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert d["user_id"].startswith("TEST_user_") and "_id" not in d

    @pytest.mark.parametrize("method", ["get", "post", "delete"])
    def test_wishlist_unauth(self, method):
        url = f"{API}/wishlist" + ("/3498" if method == "delete" else "")
        kw = {"json": {"game_id": 3498, "name": "x"}} if method == "post" else {}
        assert getattr(requests, method)(url, **kw).status_code == 401

    def test_wishlist_crud(self, auth):
        item = {"game_id": 3498, "name": "Grand Theft Auto V", "platforms": ["PC"], "genres": ["Action"], "rating": 4.5}
        r = requests.post(f"{API}/wishlist", json=item, headers=auth)
        assert r.status_code == 200 and r.json()["ok"]
        # idempotent upsert
        requests.post(f"{API}/wishlist", json=item, headers=auth)
        lst = requests.get(f"{API}/wishlist", headers=auth).json()
        assert len([w for w in lst if w["game_id"] == 3498]) == 1
        assert lst[0]["name"] == "Grand Theft Auto V" and "_id" not in lst[0]
        r = requests.delete(f"{API}/wishlist/3498", headers=auth)
        assert r.status_code == 200
        lst = requests.get(f"{API}/wishlist", headers=auth).json()
        assert not any(w["game_id"] == 3498 for w in lst)

    def test_wishlist_validation(self, auth):
        r = requests.post(f"{API}/wishlist", json={"name": "no id"}, headers=auth)
        assert r.status_code == 422


# ---------- AI Guide ----------
class TestAI:
    def test_chat_stream_and_history(self):
        sid = f"TEST_{uuid.uuid4()}"
        r = requests.post(f"{API}/ai/chat", json={"session_id": sid, "message": "Name one PS5 game in 5 words."},
                          stream=True, timeout=90)
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")
        text, err, done = "", None, False
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            d = line[6:]
            if d == "[DONE]":
                done = True
                break
            ev = json.loads(d)
            if "error" in ev:
                err = ev["error"]
            text += ev.get("delta", "")
        assert done
        assert err is None, f"AI error: {err}"
        assert len(text) > 0
        h = requests.get(f"{API}/ai/history/{sid}").json()
        assert [m["role"] for m in h] == ["user", "assistant"]
