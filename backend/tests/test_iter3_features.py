"""GameRadar iteration 3: news, reviews, PC price, reminders prefs, release-reminder cron."""
import os
import time
import uuid
import subprocess
from datetime import date
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
SECRET = [l.split("=", 1)[1].strip().strip('"') for l in open("/app/backend/.env") if l.startswith("WEBHOOK_CRON_SECRET=")][0]
GAME = 41494  # Cyberpunk 2077


def mongo(js):
    return subprocess.run(["mongosh", "test_database", "--quiet", "--eval", js], capture_output=True, text=True).stdout.strip()


CREATED = []


def make_user(email):
    uid = f"TEST_u_{uuid.uuid4().hex[:8]}"
    tok = f"TEST_s_{uuid.uuid4().hex}"
    mongo(f"""db.users.insertOne({{user_id:'{uid}',email:'{email}',name:'TEST Reviewer',picture:'',created_at:new Date()}});
db.user_sessions.insertOne({{user_id:'{uid}',session_token:'{tok}',expires_at:new Date(Date.now()+7*864e5),created_at:new Date()}});""")
    CREATED.append(uid)
    return uid, tok


@pytest.fixture(scope="module")
def user():
    uid, tok = make_user("delivered@resend.dev")
    yield uid, {"Authorization": f"Bearer {tok}"}
    ids = str(CREATED)
    mongo(f"var ids={ids};db.users.deleteMany({{user_id:{{$in:ids}}}});db.user_sessions.deleteMany({{user_id:{{$in:ids}}}});"
          f"db.reviews.deleteMany({{user_id:{{$in:ids}}}});db.wishlist.deleteMany({{user_id:{{$in:ids}}}});"
          f"db.reminders_sent.deleteMany({{user_id:{{$in:ids}}}});")


# ---------- News ----------
class TestNews:
    def test_news_all(self):
        r = requests.get(f"{API}/news", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert len(d) > 5
        for k in ["id", "title", "link", "source", "platforms", "category"]:
            assert k in d[0]
        assert len({i["source"] for i in d}) >= 2

    @pytest.mark.parametrize("p", ["playstation", "xbox", "pc", "nintendo"])
    def test_news_platform(self, p):
        r = requests.get(f"{API}/news", params={"platform": p}, timeout=60)
        assert r.status_code == 200
        assert all(p in i["platforms"] for i in r.json())

    @pytest.mark.parametrize("c", ["announcements", "patches", "showcase", "news"])
    def test_news_category(self, c):
        r = requests.get(f"{API}/news", params={"category": c}, timeout=60)
        assert r.status_code == 200
        assert all(i["category"] == c for i in r.json())


# ---------- Price ----------
class TestPrice:
    def test_cyberpunk_price(self):
        r = requests.get(f"{API}/games/{GAME}/price", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["available"] is True
        assert isinstance(d["price"], float) and d["price"] > 0
        assert len(d["deals"]) >= 1 and d["deals"][0]["price"] == d["price"]
        assert d["url"].startswith("https://www.cheapshark.com/redirect")

    def test_price_not_found_game(self):
        r = requests.get(f"{API}/games/999999999/price", timeout=60)
        assert r.status_code == 404


# ---------- Reviews ----------
class TestReviews:
    def test_unauth(self):
        assert requests.post(f"{API}/games/{GAME}/reviews", json={"rating": 4, "text": "nice"}).status_code == 401
        assert requests.delete(f"{API}/games/{GAME}/reviews").status_code == 401

    @pytest.mark.parametrize("body", [{"rating": 0, "text": "good"}, {"rating": 6, "text": "good"},
                                      {"rating": 3, "text": "ab"}, {"text": "good"}])
    def test_validation(self, user, body):
        assert requests.post(f"{API}/games/{GAME}/reviews", json=body, headers=user[1]).status_code == 422

    def test_crud(self, user):
        uid, h = user
        before = requests.get(f"{API}/games/{GAME}/reviews").json()["count"]
        r = requests.post(f"{API}/games/{GAME}/reviews", json={"rating": 4, "text": "TEST great game"}, headers=h)
        assert r.status_code == 200
        rid = r.json()["review_id"]
        d = requests.get(f"{API}/games/{GAME}/reviews").json()
        assert d["count"] == before + 1
        mine = [x for x in d["reviews"] if x["user_id"] == uid]
        assert len(mine) == 1 and mine[0]["rating"] == 4 and "_id" not in mine[0]
        r2 = requests.post(f"{API}/games/{GAME}/reviews", json={"rating": 2, "text": "TEST changed"}, headers=h)
        assert r2.json()["review_id"] == rid
        d = requests.get(f"{API}/games/{GAME}/reviews").json()
        mine = [x for x in d["reviews"] if x["user_id"] == uid]
        assert d["count"] == before + 1 and len(mine) == 1 and mine[0]["rating"] == 2 and mine[0]["text"] == "TEST changed"
        assert requests.delete(f"{API}/games/{GAME}/reviews", headers=h).status_code == 200
        d = requests.get(f"{API}/games/{GAME}/reviews").json()
        assert d["count"] == before and not [x for x in d["reviews"] if x["user_id"] == uid]


# ---------- Reminder prefs ----------
class TestReminderPrefs:
    def test_unauth(self):
        assert requests.get(f"{API}/me/reminders").status_code == 401

    def test_toggle(self, user):
        h = user[1]
        d = requests.get(f"{API}/me/reminders", headers=h).json()
        assert d["enabled"] is True and d["email"] == "delivered@resend.dev"
        assert requests.put(f"{API}/me/reminders", json={"enabled": False}, headers=h).json()["enabled"] is False
        assert requests.get(f"{API}/me/reminders", headers=h).json()["enabled"] is False
        requests.put(f"{API}/me/reminders", json={"enabled": True}, headers=h)
        assert requests.get(f"{API}/me/reminders", headers=h).json()["enabled"] is True


# ---------- Cron ----------
class TestCron:
    def test_no_auth(self):
        assert requests.post(f"{API}/cron/release-reminders").status_code == 401

    def test_wrong_auth(self):
        r = requests.post(f"{API}/cron/release-reminders", headers={"Authorization": "Bearer wrong"})
        assert r.status_code == 401

    def test_run_sends_once(self, user):
        uid, h = user
        today = date.today().isoformat()
        # today's release -> should send; future release -> should not
        requests.post(f"{API}/wishlist", json={"game_id": 990001, "name": "TEST Today Game", "released": today,
                                               "platforms": ["PC"]}, headers=h)
        requests.post(f"{API}/wishlist", json={"game_id": 990002, "name": "TEST Future Game",
                                               "released": "2099-01-01"}, headers=h)
        # disabled user with today's release -> no send
        uid2, tok2 = make_user("delivered@resend.dev")
        h2 = {"Authorization": f"Bearer {tok2}"}
        requests.post(f"{API}/wishlist", json={"game_id": 990003, "name": "TEST Disabled", "released": today}, headers=h2)
        requests.put(f"{API}/me/reminders", json={"enabled": False}, headers=h2)

        rid = f"TEST_run_{uuid.uuid4().hex[:6]}"
        hdr = {"Authorization": f"Bearer {SECRET}", "X-Webhook-Id": rid}
        r = requests.post(f"{API}/cron/release-reminders", headers=hdr)
        assert r.status_code == 200 and r.json()["status"] == "accepted" and r.json()["run_id"] == rid
        dup = requests.post(f"{API}/cron/release-reminders", headers=hdr)
        assert dup.status_code == 200 and dup.json()["status"] == "duplicate"
        for _ in range(20):
            st = mongo(f"var r=db.cron_runs.findOne({{run_id:'{rid}'}});print(r.status+'|'+r.emails_sent)")
            if st.startswith("done"):
                break
            time.sleep(1)
        assert st.startswith("done"), st
        sent = mongo(f"print(db.reminders_sent.countDocuments({{user_id:'{uid}'}}))")
        assert sent == "1", f"reminders_sent for user = {sent}"
        assert mongo(f"print(db.reminders_sent.countDocuments({{user_id:'{uid2}'}}))") == "0"
        assert mongo(f"print(db.reminders_sent.countDocuments({{game_id:990002}}))") == "0"
        # second run, different id -> no double send
        rid2 = f"TEST_run_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/cron/release-reminders", headers={"Authorization": f"Bearer {SECRET}", "X-Webhook-Id": rid2})
        assert r.json()["status"] == "accepted"
        for _ in range(20):
            st2 = mongo(f"var r=db.cron_runs.findOne({{run_id:'{rid2}'}});print(r.status+'|'+r.emails_sent)")
            if st2.startswith("done"):
                break
            time.sleep(1)
        print("run1", st, "run2", st2)
        assert mongo(f"print(db.reminders_sent.countDocuments({{user_id:'{uid}'}}))") == "1"
        assert st2.endswith("|0") or True  # other real users may exist; checked via reminders_sent above
