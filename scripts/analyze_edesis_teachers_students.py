import json
import glob
import re
import os

print("=== 1. ANALYZING DUMP FOR 61 STUDENTS ===")
dump_path = "scripts/edesis_dump_data.json"
if os.path.exists(dump_path):
    with open(dump_path, "r", encoding="utf-8") as f:
        d = json.load(f)
    
    sz = d.get("sozlesmeler", [])
    gl = d.get("gelirler", [])
    st = d.get("students", [])
    tk = d.get("taksitler", [])
    
    # 2026-2027 donem
    sz_26 = [s for s in sz if s.get("donemAdi") == "2026-2027"]
    gl_26 = [g for g in gl if g.get("donemAdi") == "2026-2027"]
    
    # Unique students in 2026-2027
    sz_stus = {s.get("ogrenciAdi") for s in sz_26 if s.get("ogrenciAdi")}
    gl_stus = {g.get("ogrenciAdiSoyadi") for g in gl_26 if g.get("ogrenciAdiSoyadi")}
    
    print(f"SZ 2026-2027 unique students: {len(sz_stus)}")
    print(f"GL 2026-2027 unique students: {len(gl_stus)}")
    
    # Check cancellations
    iptal_names = set()
    for g in gl:
        desc = str(g.get("aciklama") or "")
        if "IPT" in desc or "iptal" in desc.lower():
            iptal_names.add(g.get("ogrenciAdiSoyadi"))
    print(f"Identified cancelled students in GL: {iptal_names}")
    
    active_sz = sz_stus - iptal_names
    print(f"SZ 2026-2027 minus cancellations: {len(active_sz)}")
    
    # Check student classes in 2026-2027
    class_counter = {}
    for s in sz_26:
        c = s.get("sinifAdi") or "Belirtilmemiş"
        class_counter[c] = class_counter.get(c, 0) + 1
    print(f"Class distribution in SZ 2026-2027: {class_counter}")

print("\n=== 2. SEARCHING FOR TEACHERS IN CODEBASE ===")
teacher_candidates = set()
for f in glob.glob("frontend/src/**/*.js", recursive=True):
    with open(f, "r", encoding="utf-8", errors="ignore") as fp:
        txt = fp.read()
    for m in re.finditer(r'(?:teacher|ogretmen|mentor|egitmen)["\']?\s*[:=]\s*["\']([^"\']+)["\']', txt, re.IGNORECASE):
        val = m.group(1).strip()
        if len(val) > 3 and not val.startswith("http") and not val.startswith("/"):
            teacher_candidates.add(val)
    for m in re.finditer(r'["\']([A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s*\([^)]+\))?)["\']', txt):
        val = m.group(1).strip()
        if any(b in val for b in ["Matematik", "Fizik", "Kimya", "Biyoloji", "Türkçe", "Tarih", "Coğrafya", "Geometri", "İngilizce", "Rehberlik", "Edebiyat", "Fen"]):
            teacher_candidates.add(val)

print("Teacher candidates found in frontend:")
for tc in sorted(teacher_candidates):
    print(" -", tc)

print("\n=== 3. CHECKING SCHEDULES & CLASSES IN D1 / API ===")
with open("frontend/src/EdesisModules.js", "r", encoding="utf-8", errors="ignore") as f:
    em = f.read()
for m in re.finditer(r'DEFAULT_TEACHERS|TEACHERS|mockTeachers|SAMPLE_TEACHERS|TEACHER_LIST', em):
    print("Found teacher constant in EdesisModules:", m.group(0))

