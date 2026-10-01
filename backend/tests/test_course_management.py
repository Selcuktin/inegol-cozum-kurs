import os
import uuid

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    env_path = "/app/frontend/.env"
    with open(env_path, encoding="utf-8") as env_file:
        BASE_URL = next(line.split("=", 1)[1].strip() for line in env_file if line.startswith("REACT_APP_BACKEND_URL="))
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture
def client():
    return requests.Session()


def test_dashboard_is_seeded_and_has_expected_collections(client):
    response = client.get(f"{BASE_URL}/api/dashboard", timeout=20)
    assert response.status_code == 200
    payload = response.json()
    for key in ("students", "payments", "expenses", "classes"):
        assert isinstance(payload[key], list)
    assert len(payload["students"]) >= 2
    assert len(payload["classes"]) >= 2
    assert all("_id" not in item for item in payload["students"] + payload["classes"])


def test_student_search_matches_student_and_parent(client):
    response = client.get(f"{BASE_URL}/api/students", params={"q": "Eylül"}, timeout=20)
    assert response.status_code == 200
    students = response.json()
    assert any(item["student_name"] == "Eylül Yılmaz" for item in students)


def test_create_student_then_payment_updates_balance(client):
    student = {
        "id": f"TEST_{uuid.uuid4()}",
        "student_name": "TEST Öğrenci",
        "parent_name": "TEST Veli",
        "total_fee": 1000,
        "paid_amount": 0,
        "installment_count": 2,
    }
    created = client.post(f"{BASE_URL}/api/students", json=student, timeout=20)
    assert created.status_code == 200
    assert created.json()["student_name"] == student["student_name"]
    fetched = client.get(f"{BASE_URL}/api/students/{student['id']}", timeout=20)
    assert fetched.status_code == 200
    assert fetched.json()["paid_amount"] == 0

    payment = client.post(
        f"{BASE_URL}/api/payments",
        json={
            "student_id": student["id"],
            "amount": 250,
            "method": "Banka Transferi",
            "bank": "TEST Bankası",
            "payment_date": "2026-03-16",
            "note": "TEST ödeme",
        },
        timeout=20,
    )
    assert payment.status_code == 200
    assert payment.json()["amount"] == 250
    updated = client.get(f"{BASE_URL}/api/students/{student['id']}", timeout=20)
    assert updated.status_code == 200
    assert updated.json()["paid_amount"] == 250


def test_payment_for_unknown_student_is_rejected(client):
    response = client.post(
        f"{BASE_URL}/api/payments",
        json={
            "student_id": "does-not-exist",
            "amount": 10,
            "method": "Nakit",
            "payment_date": "2026-03-16",
        },
        timeout=20,
    )
    assert response.status_code == 404
    assert "Öğrenci" in response.text


def test_payment_rejects_non_positive_amount(client):
    student_id = f"TEST_{uuid.uuid4()}"
    created = client.post(
        f"{BASE_URL}/api/students",
        json={"id": student_id, "student_name": "TEST Validation", "parent_name": "TEST Veli", "total_fee": 1000},
        timeout=20,
    )
    assert created.status_code == 200
    response = client.post(
        f"{BASE_URL}/api/payments",
        json={"student_id": student_id, "amount": -1, "method": "Nakit", "payment_date": "2026-03-16"},
        timeout=20,
    )
    assert response.status_code == 422
    assert "sıfırdan büyük" in response.text


def test_payment_rejects_amount_over_remaining_balance(client):
    student_id = f"TEST_{uuid.uuid4()}"
    created = client.post(
        f"{BASE_URL}/api/students",
        json={"id": student_id, "student_name": "TEST Balance", "parent_name": "TEST Veli", "total_fee": 1000},
        timeout=20,
    )
    assert created.status_code == 200
    response = client.post(
        f"{BASE_URL}/api/payments",
        json={"student_id": student_id, "amount": 1001, "method": "Nakit", "payment_date": "2026-03-16"},
        timeout=20,
    )
    assert response.status_code == 422
    assert "kalan bakiyeyi" in response.text


def test_create_class_and_expense(client):
    class_response = client.post(
        f"{BASE_URL}/api/classes",
        json={"name": "TEST Sınıf", "level": "12. Sınıf", "room": "TEST 1", "capacity": 18, "teacher": "TEST Öğretmen"},
        timeout=20,
    )
    assert class_response.status_code == 200
    assert class_response.json()["name"] == "TEST Sınıf"

    expense_response = client.post(
        f"{BASE_URL}/api/expenses",
        json={"title": "TEST Gider", "amount": 125, "expense_date": "2026-03-16", "category": "Genel"},
        timeout=20,
    )
    assert expense_response.status_code == 200
    assert expense_response.json()["amount"] == 125