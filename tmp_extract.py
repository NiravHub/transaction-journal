from pathlib import Path
import re
text = Path('public/index.html').read_text(encoding='utf-8')
m = re.search(r'<script[^>]*>([\s\S]*)</script>', text)
if not m:
    raise SystemExit('no script found')
Path('tmp_check.js').write_text(m.group(1), encoding='utf-8')
