"""
Self-contained verification check for Edesis ERP modules & formulas
Runs with standard python3: python verify_edesis.py
"""

def calc_exam_net(correct, incorrect, exam_type="TYT"):
    divisor = 3 if exam_type == "LGS" else 4
    net = max(0.0, float(correct) - (float(incorrect) / divisor))
    return round(net, 2)

def calc_mock_score(total_net):
    return round(100.0 + (float(total_net) * 3.3), 2)

def format_hata_karnesi(weak_topics_json_or_list):
    import json
    if isinstance(weak_topics_json_or_list, str):
        try:
            topics = json.loads(weak_topics_json_or_list)
        except Exception:
            topics = [s.strip() for s in weak_topics_json_or_list.split(",") if s.strip()]
    else:
        topics = weak_topics_json_or_list
    return [f"⚠️ {t}" for t in topics]

def test_calculations():
    # TYT Net Test (4 wrong = 1 correct penalty)
    assert calc_exam_net(33, 4, "TYT") == 32.0, "TYT 33D 4Y should equal 32.00 net"
    assert calc_exam_net(29, 3, "TYT") == 28.25, "TYT 29D 3Y should equal 28.25 net"
    assert calc_exam_net(0, 5, "TYT") == 0.0, "Net cannot be negative"

    # LGS Net Test (3 wrong = 1 correct penalty)
    assert calc_exam_net(18, 3, "LGS") == 17.0, "LGS 18D 3Y should equal 17.00 net"
    assert calc_exam_net(15, 2, "LGS") == 14.33, "LGS 15D 2Y should equal 14.33 net"

    # Score calculation
    assert calc_mock_score(89.0) == 393.7, "Score calculation check"

    # Hata karnesi topic parser
    topics_json = '["Trigonometri", "Paragrafta Yapı", "Optik"]'
    formatted = format_hata_karnesi(topics_json)
    assert len(formatted) == 3
    assert formatted[0] == "⚠️ Trigonometri"

    print("[OK] All Edesis mathematical & logical checks passed successfully!")

if __name__ == "__main__":
    test_calculations()
