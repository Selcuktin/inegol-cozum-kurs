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

print("--- 1. Testing Auth ---")
# Wrong password
status, res = request("POST", "/auth/quick-login", {"role": "admin", "password": "wrong"})
assert status == 401, f"Expected 401 for wrong admin password, got {status}: {res}"
print("[OK] Admin wrong password rejected (401)")

# Wrong staff password
status, res = request("POST", "/auth/quick-login", {"role": "muhasebe", "password": "wrong"})
assert status == 401, f"Expected 401 for wrong staff password, got {status}: {res}"
print("[OK] Staff wrong password rejected (401)")

# Correct admin password
status, user = request("POST", "/auth/quick-login", {"role": "admin", "password": "cozum2026"})
assert status == 200, f"Expected 200 for correct admin password, got {status}: {user}"
assert user.get("role") == "admin"
token = user.get("session_token")
assert token, "Session token missing"
print(f"[OK] Admin login successful. User: {user.get('name')}, Role: {user.get('role')}")

# GET /auth/me
status, me = request("GET", "/auth/me", headers={"Authorization": f"Bearer {token}"})
assert status == 200, f"Expected 200 for /auth/me, got {status}: {me}"
print(f"[OK] /auth/me verified: {me.get('email')}")

print("\n--- 2. Testing Core Data Endpoints ---")
# GET /dashboard
status, dash = request("GET", "/dashboard")
assert status == 200, f"/dashboard failed: {status}"
print(f"[OK] /dashboard OK: {len(dash.get('students', []))} students, {len(dash.get('payments', []))} payments, {len(dash.get('classes', []))} classes")

# GET /GetSummary
status, summary = request("GET", "/GetSummary")
assert status == 200, f"/GetSummary failed: {status}"
print(f"[OK] /GetSummary OK: totalStudents={summary.get('result', {}).get('totalStudents')}, active={summary.get('result', {}).get('activeStudents')}")

# GET /GetRecentRegistrations
status, recent = request("GET", "/GetRecentRegistrations?Count=5")
assert status == 200, f"/GetRecentRegistrations failed: {status}"
print(f"[OK] /GetRecentRegistrations OK: {len(recent.get('result', []))} items")

# GET /GetClassCapacities
status, caps = request("GET", "/GetClassCapacities")
assert status == 200, f"/GetClassCapacities failed: {status}"
print(f"[OK] /GetClassCapacities OK: {caps.get('result', {}).get('totalCount')} classes")

# GET /GetGradeDistribution
status, grades = request("GET", "/GetGradeDistribution")
assert status == 200, f"/GetGradeDistribution failed: {status}"
print(f"[OK] /GetGradeDistribution OK: {len(grades.get('result', []))} grade buckets")

# GET /GetStudentStateDistribution
status, states = request("GET", "/GetStudentStateDistribution")
assert status == 200, f"/GetStudentStateDistribution failed: {status}"
print(f"[OK] /GetStudentStateDistribution OK: {len(states.get('result', []))} state buckets")

# GET /GetMissingDataAlerts
status, alerts = request("GET", "/GetMissingDataAlerts")
assert status == 200, f"/GetMissingDataAlerts failed: {status}"
print(f"[OK] /GetMissingDataAlerts OK: {alerts.get('result', {}).get('totalCount')} alerts")

# GET /students
status, students = request("GET", "/students")
assert status == 200, f"/students failed: {status}"
assert len(students) >= 100, f"Expected at least 100 students, got {len(students)}"
first_stu = students[0]
stu_id = first_stu["id"]
print(f"[OK] /students OK: {len(students)} students loaded. First: {first_stu.get('student_name')} ({stu_id})")

# GET /students/:id
status, stu_single = request("GET", f"/students/{stu_id}")
assert status == 200, f"/students/{stu_id} failed: {status}"
print(f"[OK] /students/{stu_id} OK: {stu_single.get('student_name')}, remaining: {stu_single.get('remaining')}")

# GET /students/:id/detail
status, stu_detail = request("GET", f"/students/{stu_id}/detail")
assert status == 200, f"/students/{stu_id}/detail failed: {status}"
assert "installment_plan" in stu_detail, "installment_plan missing in detail"
print(f"[OK] /students/{stu_id}/detail OK: installment plan has {len(stu_detail['installment_plan'])} installments")

print("\n--- 3. Testing Educational Modules Endpoints ---")
# GET /classes
status, classes = request("GET", "/classes")
assert status == 200, f"/classes failed: {status}"
print(f"[OK] /classes OK: {len(classes)} classes")

# GET /exams
status, exams = request("GET", "/exams")
assert status == 200, f"/exams failed: {status}"
print(f"[OK] /exams OK: {len(exams)} exams")
if exams:
    ex_id = exams[0]["id"]
    status, exam_detail = request("GET", f"/exams/{ex_id}")
    assert status == 200, f"/exams/{ex_id} failed: {status}"
    print(f"[OK] /exams/{ex_id} OK: {exam_detail.get('title')}, {len(exam_detail.get('results', []))} results")

# GET /attendance
status, att = request("GET", "/attendance")
assert status == 200, f"/attendance failed: {status}"
print(f"[OK] /attendance OK: {len(att)} student records returned for today")

# GET /schedules
status, schedules = request("GET", "/schedules")
assert status == 200, f"/schedules failed: {status}"
print(f"[OK] /schedules OK: {len(schedules)} schedule slots")

# GET /homework
status, hw = request("GET", "/homework")
assert status == 200, f"/homework failed: {status}"
print(f"[OK] /homework OK: {len(hw)} homework assignments")
if hw:
    hw_id = hw[0]["id"]
    status, hw_subs = request("GET", f"/homework/{hw_id}/submissions")
    assert status == 200, f"/homework/{hw_id}/submissions failed: {status}"
    print(f"[OK] /homework/{hw_id}/submissions OK: {len(hw_subs.get('students', []))} students tracked")

# GET /mentorship
status, mentor = request("GET", "/mentorship")
assert status == 200, f"/mentorship failed: {status}"
print(f"[OK] /mentorship OK: {len(mentor)} mentorship records")

print("\n--- 4. Testing Accounting, Audit & System Endpoints ---")
# GET /reminders
status, reminders = request("GET", "/reminders?days=30")
assert status == 200, f"/reminders failed: {status}"
print(f"[OK] /reminders OK: {len(reminders)} upcoming/overdue reminders found")

# GET /optical/templates
status, opt_tpl = request("GET", "/optical/templates")
assert status == 200, f"/optical/templates failed: {status}"
print(f"[OK] /optical/templates OK: {len(opt_tpl)} templates")

# GET /optical/printer-profiles
status, opt_prof = request("GET", "/optical/printer-profiles")
assert status == 200, f"/optical/printer-profiles failed: {status}"
print(f"[OK] /optical/printer-profiles OK: {len(opt_prof)} printer profiles")

# GET /users
status, users = request("GET", "/users")
assert status == 200, f"/users failed: {status}"
print(f"[OK] /users OK: {len(users)} users")

# GET /audit-logs
status, logs = request("GET", "/audit-logs")
assert status == 200, f"/audit-logs failed: {status}"
print(f"[OK] /audit-logs OK: {len(logs)} audit log records")

# POST /auth/logout
status, logout_res = request("POST", "/auth/logout")
assert status == 200, f"/auth/logout failed: {status}"
print("[OK] /auth/logout OK")

print("\n>>> ALL SYSTEM API ENDPOINTS VERIFIED AND HEALTHY! <<<")
