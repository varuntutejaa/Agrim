"""List every Hindi string in the app with its English original, as a markdown table body."""
import re, subprocess, sys
ROOT = sys.argv[1]
DEV = re.compile(r"[\u0900-\u097F]")
LIT = re.compile(r'"((?:[^"\\]|\\.)*)"|`([^`]*)`|\'((?:[^\'\\]|\\.)*)\'')

def lits(line):
    return [next(g for g in m.groups() if g is not None) for m in LIT.finditer(line)]

src = open(f"{ROOT}/web/src/i18n.ts", encoding="utf-8").read().splitlines()
def block(start_pat):
    i = next(n for n, l in enumerate(src) if re.match(start_pat, l))
    out, depth = {}, 0
    key_re = re.compile(r"^\s{4}(\w+):\s*(.*)$")
    cur = None
    for n in range(i + 1, len(src)):
        l = src[n]
        if re.match(r"^  \},?\s*$", l):
            break
        m = key_re.match(l)
        if m:
            cur = m.group(1); out[cur] = [(n + 1, l)]
        elif cur:
            out[cur].append((n + 1, l))
    return out
en, hi = block(r"^  en: \{"), block(r"^  hi: \{")
rows = []
for k, lines in hi.items():
    text = " ".join(l for _, l in lines)
    if not DEV.search(text):
        continue
    h = " / ".join(s for s in lits(text) if DEV.search(s) or s.strip(" ,.")) or text.strip()
    e = " / ".join(lits(" ".join(l for _, l in en.get(k, [])))) or "(server text)"
    rows.append((f"web/src/i18n.ts:{lines[0][0]}", k, e, h))
# Everything else with Hindi
out = subprocess.run(["git", "-C", ROOT, "grep", "-n", "-P", r"[\x{0900}-\x{097F}]", "--", "web/src", "model", "api", ":!*.json"],
                     capture_output=True, text=True).stdout.splitlines()
hi_lines = {l[0] for _, ls in hi.items() for l in ls}
for o in out:
    path, num, line = o.split(":", 2)
    if path == "web/src/i18n.ts" and int(num) in hi_lines:
        continue
    h = " / ".join(s for s in lits(line) if DEV.search(s)) or line.strip()
    rows.append((f"{path}:{num}", "", "", h))
for where, k, e, h in rows:
    cell = lambda s: s.replace("|", "\\|").replace("\n", " ")
    print(f"| {where} | {k} | {cell(e)} | {cell(h)} | |")
