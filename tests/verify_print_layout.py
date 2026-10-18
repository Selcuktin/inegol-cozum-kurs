"""Optional independent layout check after PRINT_FIXTURES=1 Jest run.

Requires development tools weasyprint and pypdf. The app has no runtime dependency
on these packages. Windows may require WEASYPRINT_DLL_DIRECTORIES for Pango.
"""
import json
import logging
from pathlib import Path
from pypdf import PdfReader
from weasyprint import HTML

logging.getLogger("weasyprint").setLevel(logging.ERROR)
root = Path(__file__).resolve().parents[1]
results = []
for name in ["contract", "receipt", "notes", "plan"]:
    source = root / "test_reports" / f"fix_print_{name}.html"
    html = source.read_text(encoding="utf-8").replace('src="/assets/', 'src="' + (root / 'frontend/public/assets').as_uri() + '/')
    target = source.with_suffix(".pdf")
    HTML(string=html, base_url=str(source.parent)).write_pdf(target)
    reader = PdfReader(target, strict=True)
    texts = [page.extract_text() for page in reader.pages]
    text = "\n".join(texts)
    assert "BACKGROUND_MUST_NOT_PRINT" not in text
    assert all(page.strip() for page in texts), f"{name}: empty page"
    assert "İpek" in text, f"{name}: Turkish student name missing"
    if name == "contract":
        assert "Kaşe / Mühür ve İmza" in text
    if name == "receipt":
        assert ''.join(text.split()).count("Uzunaçıklama.") == 60, "Receipt note was clipped"
        assert "125,00" in text
    if name == "notes":
        assert len(texts) == 3
        assert all(f"SIRA NO: {n+1}/ 3" in t.replace(" ", "") or f"{n+1}/3" in t.replace(" ", "") for n,t in enumerate(texts))
    if name == "plan":
        assert "120.Taksit" in text.replace(" ", "")
        assert all("Vade Tarihi" in t for t in texts), "Continuation table header missing"
    results.append({"document": name, "pages": len(texts), "characters": len(text), "passed": True})
(root / "test_reports/fix_print_layout_results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps(results))
