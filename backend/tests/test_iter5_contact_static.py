# Iteration 5: contact endpoint (validation, persistence, rate limit) + static favicon/ads assets
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

RUN = uuid.uuid4().hex[:8]


def ip(n=0):
    return f"10.99.{int(RUN[:2], 16)}.{n}"


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    db.contact_messages.delete_many({"name": {"$regex": "^TEST_"}})
    db.contact_messages.delete_many({"email": "t@x.com"})


def post(payload, xff):
    return requests.post(f"{BASE_URL}/api/contact", json=payload, headers={"X-Forwarded-For": xff}, timeout=20)


GOOD = {"name": "TEST_Alice", "email": "alice@example.com", "subject": "General", "message": "Hello there GameRadar team"}


# Static assets: favicon, icons, manifest, ads.txt
@pytest.mark.parametrize("path,ctype", [
    ("/favicon.ico", "image"), ("/logo192.png", "image"), ("/apple-touch-icon.png", "image"),
    ("/manifest.json", "json"), ("/ads.txt", "text"),
])
def test_static_assets(path, ctype):
    r = requests.get(BASE_URL + path, timeout=20)
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert "html" not in ct, f"{path} served as html ({ct})"
    if path == "/ads.txt":
        assert "pub-7591901240303237" in r.text
    if path == "/manifest.json":
        assert r.json().get("icons")


def test_index_html_head():
    t = requests.get(BASE_URL + "/", timeout=20).text
    assert "<title>GameRadar | New Releases, Charts &amp; Game Info</title>" in t or "<title>GameRadar | New Releases, Charts & Game Info</title>" in t
    assert 'rel="icon"' in t
    i_consent = t.find('gtag("consent", "default"')
    i_ads = t.find("adsbygoogle.js")
    assert 0 < i_consent < i_ads


# Contact: success + persistence
def test_contact_success_persists():
    p = {**GOOD, "name": f"TEST_ok_{RUN}"}
    r = post(p, ip(1))
    assert r.status_code == 200 and r.json() == {"ok": True}
    doc = db.contact_messages.find_one({"name": p["name"]})
    assert doc and doc["email"] == "alice@example.com" and doc["status"] == "new" and doc["ip"] == ip(1)


@pytest.mark.parametrize("override", [
    {"email": "not-an-email"}, {"email": "a@b"}, {"message": "short"}, {"name": ""}, {"subject": "x" * 61},
])
def test_contact_validation(override):
    r = post({**GOOD, **override}, ip(2))
    assert r.status_code == 422


def test_contact_rate_limit():
    x = ip(3)
    codes = [post({**GOOD, "name": f"TEST_rl_{RUN}_{i}"}, x).status_code for i in range(6)]
    assert codes[:5] == [200] * 5
    assert codes[5] == 429
    # different ip unaffected
    assert post({**GOOD, "name": f"TEST_rl2_{RUN}"}, ip(4)).status_code == 200
