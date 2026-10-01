import json

def get_effective_total_fee(student):
    base = float(student.get("total_fee") or 0)
    extra_sum = 0
    extras = student.get("extra_fees")
    if isinstance(extras, str):
        try:
            extras = json.loads(extras or "{}")
        except:
            extras = {}
    if isinstance(extras, dict):
        extra_sum = sum(float(v or 0) for v in extras.values())
    discount = float(student.get("discount_amount") or 0)
    return max(0.0, base + extra_sum - discount)

def compute_installment_plan(student):
    n = max(1, int(student.get("installment_count") or 1))
    total = get_effective_total_fee(student)
    per = round((total / n), 2)
    plan = []
    for i in range(n):
        installment_amount = round(total - (per * (n - 1)), 2) if (i == n - 1) else per
        plan.append(installment_amount)
    return plan

# Test 1: Effective fee calculation
s1 = {"total_fee": 40000, "extra_fees": json.dumps({"kaynak": 5000, "dnm": 2000}), "discount_amount": 3000}
eff1 = get_effective_total_fee(s1)
assert eff1 == 44000.0, f"Expected 44000, got {eff1}"

# Test 2: Effective fee with string extra_fees and 0 discount
s2 = {"total_fee": 18000, "extra_fees": "{}", "discount_amount": 0}
eff2 = get_effective_total_fee(s2)
assert eff2 == 18000.0, f"Expected 18000, got {eff2}"

# Test 3: Installment plan sum exactly matches total (no penny drift)
s3 = {"total_fee": 10000, "installment_count": 3}
plan3 = compute_installment_plan(s3)
assert sum(plan3) == 10000.0, f"Expected sum 10000.0, got {sum(plan3)} from {plan3}"

s4 = {"total_fee": 25000, "extra_fees": {"kaynak": 1250}, "discount_amount": 500, "installment_count": 7}
plan4 = compute_installment_plan(s4)
expected_total4 = get_effective_total_fee(s4)
assert round(sum(plan4), 2) == round(expected_total4, 2), f"Expected {expected_total4}, got {sum(plan4)}"

print("ALL LOGICAL SELF-CHECKS PASSED SUCCESSFULLY!")
