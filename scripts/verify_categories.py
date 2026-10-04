import re

with open("scripts/edesis_full_production_seed.sql", "r", encoding="utf-8") as f:
    sql = f.read()

student_inserts = re.findall(r"INSERT OR REPLACE INTO students\s*\([^)]+\)\s*VALUES\s*\(([^;]+)\);", sql)
print("Total student inserts in seed:", len(student_inserts))

cancelled = ["SERHAT SERBEST", "EMİR PARILDAR", "EMRİYE AYTAN", "NEVRA KILINÇ"]
active_26 = ["SEBİLE AKDEMİR", "ELİFSU ÇAĞLAYAN", "YAVUZ EMİR BALCI", "MUSTAFA SİNİR", "ZEYNEP MASAL ÇELİK", "EBUBEKİR ASAF VERGİLİ"]

cats = {}
students = []
for ins in student_inserts:
    tokens = [t.strip().strip("'") for t in re.findall(r"'[^']*'|\b\d+(?:\.\d+)?\b|\bNULL\b", ins)]
    if len(tokens) >= 14:
        name = tokens[1].upper()
        prog = tokens[11]
        fee = float(tokens[12])
        if any(k in name for k in active_26):
            prog = "2026-2027"
        if any(c in name for c in cancelled):
            status = "İptal / Ayrılan"
        elif prog == "2026-2027-YAZ":
            status = "Yaz Kursu"
        elif prog == "2025-2026":
            status = "Mezun / Geçmiş"
        elif fee < 10:
            status = "Geçmiş / Deneme"
        else:
            status = "Kesin Kayıt"
        cats[status] = cats.get(status, 0) + 1
        students.append((name, prog, status, fee))

print("Categories count:")
for k, v in cats.items():
    print(f"  {k}: {v}")
print("Total analyzed:", len(students))
