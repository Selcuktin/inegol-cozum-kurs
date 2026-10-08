import json
import sqlite3
from pathlib import Path


def main() -> None:
    schema_path = Path("/app/frontend/schema.sql")
    sql = schema_path.read_text(encoding="utf-8")

    conn = sqlite3.connect(":memory:")
    try:
        conn.executescript(sql)
        cur = conn.cursor()

        results = {}

        cur.execute("SELECT COUNT(*) FROM students")
        results["students_count"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM contracts")
        results["contracts_count"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM student_incomes")
        results["student_incomes_count"] = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*)
            FROM contracts c
            LEFT JOIN students s ON s.id = c.student_id
            WHERE s.id IS NULL
            """
        )
        results["contracts_orphan_student_id_count"] = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*)
            FROM student_incomes i
            LEFT JOIN contracts c ON c.id = i.contract_id
            WHERE IFNULL(i.contract_id, '') <> ''
              AND c.id IS NULL
            """
        )
        results["incomes_orphan_contract_id_count"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM student_incomes WHERE COALESCE(contract_id, '') = ''")
        results["incomes_missing_contract_id_count"] = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*) FROM student_incomes i
            LEFT JOIN contracts c ON c.sozlesme_no = i.sozlesme_no
            WHERE c.id IS NULL
            """
        )
        results["incomes_orphan_contract_number_count"] = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*)
            FROM student_incomes
            WHERE ABS(COALESCE(brut_tutar, 0) - (COALESCE(toplam_tahsilat, 0) + COALESCE(kalan_alacak, 0))) > 0.01
            """
        )
        results["incomes_balance_mismatch_count"] = cur.fetchone()[0]

        cur.execute("PRAGMA foreign_key_list(contracts)")
        results["contracts_fk_count"] = len(cur.fetchall())

        cur.execute("PRAGMA foreign_key_list(student_incomes)")
        results["student_incomes_fk_count"] = len(cur.fetchall())

        cur.execute("SELECT COUNT(*) FROM contracts WHERE period_id IS NULL")
        results["contracts_missing_period_id_count"] = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM student_incomes WHERE period_id IS NULL")
        results["incomes_missing_period_id_count"] = cur.fetchone()[0]

        cur.execute(
            """
            SELECT COUNT(*) FROM contracts c
            JOIN academic_periods p ON p.id = c.period_id
            WHERE c.sozlesme_tarihi > p.end_date AND p.end_date <> ''
            """
        )
        results["contracts_after_period_end_count"] = cur.fetchone()[0]

        print(json.dumps(results, ensure_ascii=False, indent=2))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
