"""Tests for Student extras (mother/guardian/extra_fees/discount) + contract upload/download."""
import os
import io
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
TOKEN = "test_session_inegol_123"
USER_ID = "test-user-inegol"
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

_mongo = MongoClient(MONGO_URL)
_db = _mongo[DB_NAME]


def set_role(role):
    _db.users.update_one({"user_id": USER_ID}, {"$set": {"role": role}})


@pytest.fixture(scope="module", autouse=True)
def restore_admin():
    set_role("admin")
    yield
    set_role("admin")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {TOKEN}"})
    return s


# Minimal valid PDF bytes
PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


class TestStudentExtraFields:
    """Create+GET verifies mother/guardian/extra_fees/discount persist."""

    def test_create_student_with_new_fields(self, client):
        set_role("admin")
        sid = f"TEST_{uuid.uuid4().hex[:10]}"
        payload = {
            "id": sid,
            "student_name": "TEST_ExtraFields Student",
            "parent_name": "TEST Baba",
            "mother_name": "TEST Anne",
            "mother_phone": "0555 111 22 33",
            "guardian_name": "TEST Vasi",
            "program": "TYT",
            "total_fee": 20000,
            "extra_fees": {"kaynak": 500, "dijital": 1000, "dnm": 0, "kutuphane": 0, "ozel_ders": 0},
            "discount_type": "kardes",
            "discount_amount": 2000,
            "discount_note": "Kardeş indirimi",
            "installment_count": 4,
            "due_date": "2026-05-15",
        }
        r = client.post(f"{BASE_URL}/api/students", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == sid
        assert data["mother_name"] == "TEST Anne"
        assert data["guardian_name"] == "TEST Vasi"
        assert data["extra_fees"]["kaynak"] == 500
        assert data["extra_fees"]["dijital"] == 1000
        assert data["discount_type"] == "kardes"
        assert data["discount_amount"] == 2000

        # GET detail to verify persistence
        r2 = client.get(f"{BASE_URL}/api/students/{sid}/detail")
        assert r2.status_code == 200
        s = r2.json()["student"]
        assert s["mother_name"] == "TEST Anne"
        assert s["mother_phone"] == "0555 111 22 33"
        assert s["guardian_name"] == "TEST Vasi"
        assert s["extra_fees"]["kaynak"] == 500
        assert s["discount_type"] == "kardes"
        assert s["discount_amount"] == 2000

        # cleanup
        _db.students.delete_one({"id": sid})

    def test_patch_student_admin_ok(self, client):
        set_role("admin")
        sid = f"TEST_{uuid.uuid4().hex[:10]}"
        client.post(f"{BASE_URL}/api/students", json={
            "id": sid, "student_name": "TEST P", "parent_name": "TEST",
            "total_fee": 10000, "installment_count": 1,
        })
        try:
            r = client.patch(f"{BASE_URL}/api/students/{sid}", json={
                "mother_name": "Updated Mom",
                "extra_fees": {"kaynak": 250, "dijital": 750, "dnm": 0, "kutuphane": 0, "ozel_ders": 0},
                "discount_type": "personel",
                "discount_amount": 1500,
            })
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["mother_name"] == "Updated Mom"
            assert data["extra_fees"]["dijital"] == 750
            assert data["discount_type"] == "personel"
            assert data["discount_amount"] == 1500

            # verify persistence via GET
            g = client.get(f"{BASE_URL}/api/students/{sid}")
            assert g.status_code == 200
            assert g.json()["mother_name"] == "Updated Mom"
        finally:
            _db.students.delete_one({"id": sid})

    def test_patch_student_muhasebe_forbidden(self, client):
        sid = f"TEST_{uuid.uuid4().hex[:10]}"
        set_role("admin")
        client.post(f"{BASE_URL}/api/students", json={
            "id": sid, "student_name": "TEST M", "parent_name": "TEST", "total_fee": 5000,
        })
        try:
            set_role("muhasebe")
            r = client.patch(f"{BASE_URL}/api/students/{sid}", json={"mother_name": "Nope"})
            assert r.status_code == 403
        finally:
            set_role("admin")
            _db.students.delete_one({"id": sid})


class TestContractUpload:
    """Contract upload/download via Emergent Object Storage."""

    @pytest.fixture
    def temp_student(self, client):
        set_role("admin")
        sid = f"TEST_{uuid.uuid4().hex[:10]}"
        client.post(f"{BASE_URL}/api/students", json={
            "id": sid, "student_name": "TEST Contract", "parent_name": "TEST", "total_fee": 1000,
        })
        yield sid
        _db.students.delete_one({"id": sid})

    def test_upload_pdf_ok_and_download(self, client, temp_student):
        set_role("admin")
        r = client.post(
            f"{BASE_URL}/api/students/{temp_student}/contract-upload",
            data=PDF_BYTES,
            headers={"Content-Type": "application/pdf", "X-Filename": "test-sozlesme.pdf"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["path"].startswith("inegol-cozum-kurs/contracts/")
        assert data["filename"] == "test-sozlesme.pdf"
        assert "uploaded_at" in data

        # Download
        g = client.get(f"{BASE_URL}/api/students/{temp_student}/contract-file")
        assert g.status_code == 200
        assert g.content == PDF_BYTES
        assert "application/pdf" in g.headers.get("content-type", "")

    def test_upload_png_ok(self, client, temp_student):
        set_role("admin")
        r = client.post(
            f"{BASE_URL}/api/students/{temp_student}/contract-upload",
            data=PNG_BYTES,
            headers={"Content-Type": "image/png", "X-Filename": "sozlesme.png"},
        )
        assert r.status_code == 200

    def test_upload_bad_extension_400(self, client, temp_student):
        set_role("admin")
        r = client.post(
            f"{BASE_URL}/api/students/{temp_student}/contract-upload",
            data=b"MZ\x90\x00malicious",
            headers={"Content-Type": "application/octet-stream", "X-Filename": "bad.exe"},
        )
        assert r.status_code == 400

    def test_upload_too_large_413(self, client, temp_student):
        set_role("admin")
        big = b"X" * (10 * 1024 * 1024 + 10)
        r = client.post(
            f"{BASE_URL}/api/students/{temp_student}/contract-upload",
            data=big,
            headers={"Content-Type": "application/pdf", "X-Filename": "big.pdf"},
        )
        assert r.status_code == 413

    def test_upload_muhasebe_forbidden(self, client, temp_student):
        set_role("muhasebe")
        try:
            r = client.post(
                f"{BASE_URL}/api/students/{temp_student}/contract-upload",
                data=PDF_BYTES,
                headers={"Content-Type": "application/pdf", "X-Filename": "a.pdf"},
            )
            assert r.status_code == 403
        finally:
            set_role("admin")

    def test_download_missing_404(self, client, temp_student):
        # No upload yet
        set_role("admin")
        r = client.get(f"{BASE_URL}/api/students/{temp_student}/contract-file")
        assert r.status_code == 404


class TestAuditEntriesForNewFeatures:
    def test_student_update_and_contract_upload_audited(self, client):
        set_role("admin")
        sid = f"TEST_{uuid.uuid4().hex[:10]}"
        client.post(f"{BASE_URL}/api/students", json={
            "id": sid, "student_name": "TEST Audit", "parent_name": "TEST", "total_fee": 3000,
        })
        try:
            client.patch(f"{BASE_URL}/api/students/{sid}", json={"mother_name": "AuditMom"})
            client.post(
                f"{BASE_URL}/api/students/{sid}/contract-upload",
                data=PDF_BYTES,
                headers={"Content-Type": "application/pdf", "X-Filename": "a.pdf"},
            )
            r = client.get(f"{BASE_URL}/api/audit-logs?limit=100")
            assert r.status_code == 200
            actions = [(a["action"], a.get("target_id")) for a in r.json()]
            assert ("student.update", sid) in actions
            assert ("contract.upload", sid) in actions
        finally:
            _db.students.delete_one({"id": sid})
