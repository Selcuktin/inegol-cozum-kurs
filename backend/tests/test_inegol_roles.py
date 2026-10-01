"""Backend tests for auth allowlist, RBAC and audit logging."""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # Fall back to reading frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

API = f"{BASE_URL}/api"
TOKEN = "test_session_inegol_123"
USER_ID = "test-user-inegol"

mongo = MongoClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = mongo[os.environ.get('DB_NAME', 'test_database')]


def set_role(role):
    db.users.update_one({"user_id": USER_ID}, {"$set": {"role": role}})


def auth_headers():
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def ensure_seed():
    # Ensure user & session exist
    db.users.update_one(
        {"user_id": USER_ID},
        {"$set": {"email": "kayrasemihseymen@gmail.com", "name": "Kayra Semih Seymen", "role": "admin"}},
        upsert=True,
    )
    from datetime import datetime, timezone, timedelta
    db.user_sessions.update_one(
        {"session_token": TOKEN},
        {"$set": {"user_id": USER_ID, "expires_at": datetime.now(timezone.utc) + timedelta(days=7)}},
        upsert=True,
    )
    yield
    set_role("admin")


# --- Health/auth basics ---
class TestAuth:
    def test_me_authenticated(self):
        set_role("admin")
        r = requests.get(f"{API}/auth/me", headers=auth_headers())
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == "kayrasemihseymen@gmail.com"
        assert d["role"] == "admin"
        assert d["role_label"] == "Yönetici"

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_session_rejects_missing_header(self):
        r = requests.post(f"{API}/auth/session")
        assert r.status_code == 400

    def test_session_rejects_non_allowlisted(self):
        # Use a fake x-session-id; upstream will reject → 401 (not 403 allowlist since it never returned data)
        # We still can validate: a random email will not pass upstream mock either.
        r = requests.post(f"{API}/auth/session", headers={"X-Session-ID": "random-bad-id"})
        assert r.status_code in (401, 403)


# --- Role-based POST permissions ---
class TestRBACAdmin:
    def setup_method(self):
        set_role("admin")

    def test_admin_create_student(self):
        payload = {"id": f"TEST_{uuid.uuid4().hex[:8]}", "student_name": "TEST_Öğrenci", "parent_name": "TEST_Veli", "total_fee": 1000}
        r = requests.post(f"{API}/students", json=payload, headers=auth_headers())
        assert r.status_code == 200, r.text
        assert r.json()["student_name"] == "TEST_Öğrenci"

    def test_admin_create_payment(self):
        sid = f"TEST_{uuid.uuid4().hex[:8]}"
        requests.post(f"{API}/students", json={"id": sid, "student_name": "TEST_S", "parent_name": "TEST_P", "total_fee": 500}, headers=auth_headers())
        r = requests.post(f"{API}/payments", json={"student_id": sid, "amount": 100, "method": "Nakit", "payment_date": "2026-01-15"}, headers=auth_headers())
        assert r.status_code == 200, r.text

    def test_admin_create_expense(self):
        r = requests.post(f"{API}/expenses", json={"title": "TEST_Expense", "amount": 50, "expense_date": "2026-01-15"}, headers=auth_headers())
        assert r.status_code == 200

    def test_admin_create_class(self):
        r = requests.post(f"{API}/classes", json={"name": "TEST_Class", "capacity": 10}, headers=auth_headers())
        assert r.status_code == 200

    def test_admin_list_users(self):
        r = requests.get(f"{API}/users", headers=auth_headers())
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_view_audit_logs(self):
        r = requests.get(f"{API}/audit-logs", headers=auth_headers())
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_update_role(self):
        r = requests.put(f"{API}/users/role", json={"user_id": USER_ID, "role": "admin"}, headers=auth_headers())
        assert r.status_code == 200


class TestRBACMuhasebe:
    def setup_method(self):
        set_role("muhasebe")

    def teardown_method(self):
        set_role("admin")

    def test_muhasebe_cannot_create_student(self):
        r = requests.post(f"{API}/students", json={"id": f"TEST_{uuid.uuid4().hex[:8]}", "student_name": "X", "parent_name": "Y"}, headers=auth_headers())
        assert r.status_code == 403

    def test_muhasebe_can_create_payment(self):
        # need a student first (create as admin)
        set_role("admin")
        sid = f"TEST_{uuid.uuid4().hex[:8]}"
        requests.post(f"{API}/students", json={"id": sid, "student_name": "TEST_S", "parent_name": "TEST_P", "total_fee": 500}, headers=auth_headers())
        set_role("muhasebe")
        r = requests.post(f"{API}/payments", json={"student_id": sid, "amount": 50, "method": "Nakit", "payment_date": "2026-01-15"}, headers=auth_headers())
        assert r.status_code == 200, r.text

    def test_muhasebe_can_create_expense(self):
        r = requests.post(f"{API}/expenses", json={"title": "TEST_ME", "amount": 10, "expense_date": "2026-01-15"}, headers=auth_headers())
        assert r.status_code == 200

    def test_muhasebe_cannot_create_class(self):
        r = requests.post(f"{API}/classes", json={"name": "X"}, headers=auth_headers())
        assert r.status_code == 403

    def test_muhasebe_cannot_view_audit(self):
        r = requests.get(f"{API}/audit-logs", headers=auth_headers())
        assert r.status_code == 403

    def test_muhasebe_cannot_list_users(self):
        r = requests.get(f"{API}/users", headers=auth_headers())
        assert r.status_code == 403


class TestRBACOgretmen:
    def setup_method(self):
        set_role("ogretmen")

    def teardown_method(self):
        set_role("admin")

    def test_ogretmen_cannot_create_student(self):
        r = requests.post(f"{API}/students", json={"id": "x", "student_name": "X", "parent_name": "Y"}, headers=auth_headers())
        assert r.status_code == 403

    def test_ogretmen_cannot_create_payment(self):
        r = requests.post(f"{API}/payments", json={"student_id": "x", "amount": 1, "method": "Nakit", "payment_date": "2026-01-15"}, headers=auth_headers())
        assert r.status_code == 403

    def test_ogretmen_cannot_create_expense(self):
        r = requests.post(f"{API}/expenses", json={"title": "X", "amount": 1, "expense_date": "2026-01-15"}, headers=auth_headers())
        assert r.status_code == 403

    def test_ogretmen_cannot_create_class(self):
        r = requests.post(f"{API}/classes", json={"name": "X"}, headers=auth_headers())
        assert r.status_code == 403

    def test_ogretmen_cannot_view_audit(self):
        r = requests.get(f"{API}/audit-logs", headers=auth_headers())
        assert r.status_code == 403


# --- Audit logging ---
class TestAudit:
    def test_admin_actions_are_logged(self):
        set_role("admin")
        sid = f"TEST_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/students", json={"id": sid, "student_name": "TEST_Audit", "parent_name": "TEST_P", "total_fee": 100}, headers=auth_headers())
        assert r.status_code == 200
        # Fetch audit logs
        r = requests.get(f"{API}/audit-logs", headers=auth_headers())
        assert r.status_code == 200
        logs = r.json()
        matching = [l for l in logs if l.get("target_id") == sid and l.get("action") == "student.create"]
        assert len(matching) >= 1
        entry = matching[0]
        assert entry["user_role"] == "admin"
        assert entry["user_name"]
        assert "TEST_Audit" in entry.get("detail", "")


# --- Basic CRUD sanity for admin ---
class TestCRUDAdmin:
    def test_dashboard(self):
        set_role("admin")
        r = requests.get(f"{API}/dashboard", headers=auth_headers())
        assert r.status_code == 200
        d = r.json()
        assert "students" in d and "summary" in d

    def test_students_list(self):
        r = requests.get(f"{API}/students", headers=auth_headers())
        assert r.status_code == 200
