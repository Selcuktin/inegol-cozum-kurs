import glob
import re

endpoints = set()
for filepath in glob.glob("frontend/src/**/*.js", recursive=True):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    # Matches axios.get(`${API}/xyz`)
    for m in re.finditer(r"axios\.(get|post|put|patch|delete)\(\s*`\$\{API\}([^`]+)`", content):
        method, path = m.groups()
        endpoints.add((method.upper(), path.split("?")[0]))
    # Matches axios.get(`${API}/xyz` + ...)
    for m in re.finditer(r"axios\.(get|post|put|patch|delete)\(\s*`\$\{API\}([^`$\s]+)", content):
        method, path = m.groups()
        endpoints.add((method.upper(), path.split("?")[0]))

for method, path in sorted(endpoints):
    print(f"{method:6} {path}")
