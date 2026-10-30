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
        assert d["available"]
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
        before = review_state(uid)[0]
        post_review(h, 4, "TEST great game")
        count, mine = review_state(uid)
        assert count == before + 1 and len(mine) == 1
        assert mine[0]["rating"] == 4 and "_id" not in mine[0]

    def test_update_keeps_single_review(self, user):
        uid, h = user
        rid = post_review(h, 4, "TEST great game")["review_id"]
        before = review_state(uid)[0]
        assert post_review(h, 2, "TEST changed")["review_id"] == rid
        count, mine = review_state(uid)
        assert count == before and len(mine) == 1
        assert (mine[0]["rating"], mine[0]["text"]) == (2, "TEST changed")

    def test_delete(self, user):
        uid, h = user
        post_review(h, 3, "TEST to delete")
        before = review_state(uid)[0]
        assert requests.delete(f"{API}/games/{GAME}/reviews", headers=h).status_code == 200
        count, mine = review_state(uid)
        assert count == before - 1 and not mine


def review_state(uid):
    d = requests.get(f"{API}/games/{GAME}/reviews").json()
    return d["count"], [x for x in d["reviews"] if x["user_id"] == uid]


def post_review(h, rating, text):
    r = requests.post(f"{API}/games/{GAME}/reviews", json={"rating": rating, "text": text}, headers=h)
    assert r.status_code == 200
    return r.json()


# ---------- Reminder prefs ----------
class TestReminderPrefs:
    def test_unauth(self):
        assert requests.get(f"{API}/me/reminders").status_code == 401

    def test_toggle(self, user):
        h = user[1]
        me = "delivered@resend.dev"
        assert requests.get(f"{API}/me/reminders", headers=h).json() == {"enabled": True, "email": me}
        assert requests.put(f"{API}/me/reminders", json={"enabled": False}, headers=h).json() == {"enabled": False}
        assert requests.get(f"{API}/me/reminders", headers=h).json() == {"enabled": False, "email": me}
        requests.put(f"{API}/me/reminders", json={"enabled": True}, headers=h)
        assert requests.get(f"{API}/me/reminders", headers=h).json() == {"enabled": True, "email": me}


# ---------- Cron ----------
def trigger_cron(run_id):
    return requests.post(f"{API}/cron/release-reminders",
                         headers={"Authorization": f"Bearer {SECRET}", "X-Webhook-Id": run_id})


def wait_for_run(run_id):
    st = ""
    for _ in range(20):
        st = mongo(f"var r=db.cron_runs.findOne({{run_id:'{run_id}'}});print(r.status+'|'+r.emails_sent)")
        if st.startswith("done"):
            return st
        time.sleep(1)
    return st


def sent_count(query):
    return mongo(f"print(db.reminders_sent.countDocuments({query}))")


def seed_cron_users(h):
    today = date.today().isoformat()
    requests.post(f"{API}/wishlist", json={"game_id": 989999001, "name": "TEST Today Game", "released": today,
                                           "platforms": ["PC"]}, headers=h)
    requests.post(f"{API}/wishlist", json={"game_id": 989999002, "name": "TEST Future Game",
                                           "released": "2099-01-01"}, headers=h)
    uid2, tok2 = make_user("delivered@resend.dev")
    h2 = {"Authorization": f"Bearer {tok2}"}
    requests.post(f"{API}/wishlist", json={"game_id": 989999003, "name": "TEST Disabled", "released": today}, headers=h2)
    requests.put(f"{API}/me/reminders", json={"enabled": False}, headers=h2)
    return uid2


class TestCron:
    def test_no_auth(self):
        assert requests.post(f"{API}/cron/release-reminders").status_code == 401

    def test_wrong_auth(self):
        r = requests.post(f"{API}/cron/release-reminders", headers={"Authorization": "Bearer wrong"})
        assert r.status_code == 401

    def test_run_sends_once(self, user):
        uid, _ = user
        uid2 = seed_cron_users(user[1])
        rid = f"TEST_run_{uuid.uuid4().hex[:6]}"
        r = trigger_cron(rid)
        assert r.status_code == 200 and r.json() == {"status": "accepted", "run_id": rid}
        assert trigger_cron(rid).json()["status"] == "duplicate"
        st = wait_for_run(rid)
        assert st.startswith("done"), st
        assert sent_count(f"{{user_id:'{uid}'}}") == "1"
        assert sent_count(f"{{user_id:'{uid2}'}}") == "0"
        assert sent_count("{game_id:989999002}") == "0"

    def test_second_run_does_not_resend(self, user):
        uid = user[0]
        rid = f"TEST_run_{uuid.uuid4().hex[:6]}"
        assert trigger_cron(rid).json()["status"] == "accepted"
        wait_for_run(rid)
        assert sent_count(f"{{user_id:'{uid}'}}") == "1"
