import urllib.request
import json
import http.cookiejar

BASE = "https://inegol-cozum-kurs.pages.dev/api"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def request(method, path, data=None, headers=None):
    url = f"{BASE}{path}"
    h = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    if headers:
        h.update(headers)
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=req_data, headers=h, method=method)
    try:
        res = opener.open(req)
        body = res.read().decode("utf-8")
        try:
            return res.status, json.loads(body)
        except:
            return res.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body

print("--- 1. Login as Admin ---")
status, user = request("POST", "/auth/quick-login", {"role": "admin", "password": "cozum2026"})
assert status == 200, f"Login failed: {user}"
token = user.get("session_token")
auth_hdr = {"Authorization": f"Bearer {token}"}
print(f"[OK] Logged in as: {user.get('name')}")

print("\n--- 2. Test Class CRUD ---")
test_class_id = None
status, new_class = request("POST", "/classes", {
    "name": "TEST-101",
    "level": "Test Seviye",
    "room": "Lab 1",
    "capacity": 25,
    "teacher": "Test Öğretmen"
}, headers=auth_hdr)
assert status == 200, f"Class create failed: {status} {new_class}"
test_class_id = new_class["id"]
print(f"[OK] Class created: {test_class_id}")

# Update class
status, updated_class = request("PUT", f"/classes/{test_class_id}", {
    "name": "TEST-101-UPDATED",
    "level": "Test Seviye 2",
    "room": "Lab 2",
    "capacity": 30,
    "teacher": "Test Öğretmen 2"
}, headers=auth_hdr)
assert status == 200, f"Class update failed: {status}"
print(f"[OK] Class updated: {updated_class.get('name')}")

# Delete class
status, del_res = request("DELETE", f"/classes/{test_class_id}", headers=auth_hdr)
assert status == 200, f"Class delete failed: {status}"
print(f"[OK] Class deleted cleanly")

print("\n--- 3. Test Schedule CRUD ---")
status, new_sch = request("POST", "/schedules", {
    "class_id": "cls-7-a",
    "day_of_week": 1,
    "time_slot": "09:00 - 09:45",
    "subject": "Deneme Matematik",
    "teacher_name": "Ahmet Hoca",
    "room": "Derslik 1"
}, headers=auth_hdr)
assert status == 201, f"Schedule create failed: {status} {new_sch}"
sch_id = new_sch["id"]
print(f"[OK] Schedule created: {sch_id}")

# Update schedule
status, up_sch = request("PUT", f"/schedules/{sch_id}", {
    "subject": "Deneme Matematik (İleri)",
    "teacher_name": "Ahmet Hoca (Uzman)",
    "room": "Derslik 2"
}, headers=auth_hdr)
assert status == 200, f"Schedule update failed: {status}"
print(f"[OK] Schedule updated")

# Delete schedule
status, del_sch = request("DELETE", f"/schedules/{sch_id}", headers=auth_hdr)
assert status == 200, f"Schedule delete failed: {status}"
print(f"[OK] Schedule deleted cleanly")

print("\n--- 4. Test Homework CRUD ---")
status, new_hw = request("POST", "/homework", {
    "class_id": "cls-7-a",
    "subject": "Matematik",
    "title": "Üslü Sayılar Test 4",
    "source_book": "Karakök Soru Bankası",
    "description": "Sayfa 45-50 arası çözülecek",
    "due_date": "2026-10-15"
}, headers=auth_hdr)
assert status == 201, f"Homework create failed: {status} {new_hw}"
hw_id = new_hw["id"]
print(f"[OK] Homework created: {hw_id}")

# Update submission
status, sub_res = request("POST", f"/homework/{hw_id}/submissions", [
    {"student_id": "stu-7086993", "status": "yapildi", "note": "Eksiksiz tamamlandı"}
], headers=auth_hdr)
assert status == 200, f"Homework submission update failed: {status}"
print(f"[OK] Homework submission recorded")

# Delete homework
status, del_hw = request("DELETE", f"/homework/{hw_id}", headers=auth_hdr)
assert status == 200, f"Homework delete failed: {status}"
print(f"[OK] Homework deleted cleanly")

print("\n--- 5. Test Mentorship CRUD ---")
status, new_men = request("POST", "/mentorship", {
    "student_id": "stu-7086993",
    "mentor_name": "Rehberlik Birimi",
    "session_date": "2026-10-03",
    "target_uni": "ODTÜ",
    "target_department": "Bilgisayar Mühendisliği",
    "weekly_target_questions": 500,
    "solved_questions": 420,
    "topics_covered": "Paragraf ve Problemler",
    "notes": "Haftalık hedef takibi iyi durumda"
}, headers=auth_hdr)
assert status == 201, f"Mentorship create failed: {status} {new_men}"
men_id = new_men["id"]
print(f"[OK] Mentorship created: {men_id}")

# Delete mentorship
status, del_men = request("DELETE", f"/mentorship/{men_id}", headers=auth_hdr)
assert status == 200, f"Mentorship delete failed: {status}"
print(f"[OK] Mentorship deleted cleanly")

print("\n--- 6. Test Attendance Save & Parent Notification ---")
status, att_save = request("POST", "/attendance", {
    "date": "2026-10-03",
    "records": [
        {"student_id": "stu-7086993", "class_id": "cls-7-a", "status": "geldi", "note": "Zamanında katıldı"}
    ]
}, headers=auth_hdr)
assert status == 200, f"Attendance save failed: {status}"
print(f"[OK] Attendance saved successfully")

status, notif_res = request("POST", "/attendance/notify", {
    "student_id": "stu-7086993",
    "date": "2026-10-03"
}, headers=auth_hdr)
assert status == 200, f"Attendance notify failed: {status}"
print(f"[OK] Attendance notification flag updated")

print("\n>>> ALL MUTATION & CRUD ENDPOINTS FUNCTIONING 100% PERFECTLY! <<<")
