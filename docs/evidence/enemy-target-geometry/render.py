"""Render the captured geometry with the repository's offline artwork."""
from csv import DictReader
from html import escape
import json
from math import cos, radians
from pathlib import Path

HERE = Path(__file__).resolve().parent
REFINED = {
    row["enemyId"]: row["slots"]
    for row in json.loads(Path("data/release/refined-monster-art.json").read_text())["assets"]
}
LOWCOST = json.loads(Path("data/presentation/lowcost-enemy-art.json").read_text())["assets"]
ALIASES = {"guardian_defense": "guardian", "lagavulin_awake": "lagavulin", "jaw_worm_hard": "jaw_worm"}
THEME = json.loads(Path("data/presentation/ui_theme.json").read_text())


def primitive(image, w, h, color):
    if image == 100001:
        return f'<rect x="{-w/2:g}" y="{-h/2:g}" width="{w:g}" height="{h:g}" fill="{color}"/>'
    if image == 100002:
        return f'<ellipse rx="{w/2:g}" ry="{h/2:g}" fill="{color}"/>'
    return f'<path d="M0 {-h/2:g} L{w/2:g} {h/2:g} H{-w/2:g} Z" fill="{color}"/>'


def artwork(id_, x, y, size):
    art_id = ALIASES.get(id_, id_)
    if id_ == "byrd_grounded":
        rows = [list(map(float, row.split(","))) for row in (HERE / "byrd-grounded.csv").read_text().splitlines()]
        slots = [{"image": int(i), "position": [x, y], "size": [w, h],
                  "rotation": [rx, ry, rz], "colour": [int(r), int(g), int(b), int(a)]}
                 for i, _, x, y, w, h, rx, ry, rz, r, g, b, a in rows]
        canvas, label = 106, "Grounded pose primitives"
    elif art_id in REFINED:
        canvas, label, slots = 106, "Refined primitives", REFINED[art_id]
    elif art_id in LOWCOST:
        canvas, label = 100, "Fallback primitives"
        slots = [{"image": s["image"], "position": [s["x"], s["y"]], "size": [s["w"], s["h"]],
                  "rotation": [0, 0, s.get("rotation", 0)], "colour": list(bytes.fromhex(s["colour"][1:]))}
                 for s in LOWCOST[art_id]["shapes"]]
    else:
        icon = THEME["icon"]["enemy"].get(id_, "tier fallback")
        return (f'<text x="{x}" y="{y}" text-anchor="middle" fill="#c4cbd6">Icon {escape(str(icon))}</text>',
                "Client icon indicated by ID")
    parts = []
    for s in slots:
        px, py = s["position"]
        rx, ry, rz = s["rotation"]
        w, h = s["size"]
        color = "#" + bytes(s["colour"]).hex()
        parts.append(f'<g transform="translate({px:g} {-py:g}) rotate({-rz:g}) '
                     f'scale({cos(radians(ry)):g} {cos(radians(rx)):g})">'
                     f'{primitive(s["image"], w, h, color)}</g>')
    return f'<g transform="translate({x} {y}) scale({size/canvas})">{"".join(parts)}</g>', label


def panel(row, scale, state):
    id_ = row["id"]
    n = {k: float(v) for k, v in row.items() if k != "id"}
    x, y = 152, 110
    art, label = artwork(id_, x, y, n["artSize"] * scale)
    hx = x + (n["hitX"] - n["artX"] - n["width"] / 2) * scale
    hy = y - (n["hitY"] - n["artY"] + n["height"] / 2) * scale
    side = n["artSize"] * scale
    l, r = [x + (n[k] - n["artX"]) * scale for k in ("left", "right")]
    t, b = [y - (n[k] - n["artY"]) * scale for k in ("top", "bottom")]
    corners = "".join(f'<path d="M{cx+dx:g} {cy:g} H{cx:g} V{cy+dy:g}"/>' for cx, dx in [(l, 10), (r, -10)]
                      for cy, dy in [(t, 10), (b, -10)])
    return f'''<figure><figcaption>{state} · {n["width"]:.1f} × {n["height"]:.1f}</figcaption>
    <svg viewBox="0 0 304 220" aria-label="{escape(id_)} {state}">
    {art}<rect x="{x-side/2:g}" y="{y-side/2:g}" width="{side:g}" height="{side:g}" class="art"/>
    <rect x="{hx:g}" y="{hy:g}" width="{n["width"]*scale:g}" height="{n["height"]*scale:g}" class="hit"/>
    <g class="corners">{corners}</g></svg><small>{label}</small></figure>'''


before = list(DictReader((HERE / "before.csv").open()))
after = list(DictReader((HERE / "after.csv").open()))
assert len(before) == len(after) and len(after) > 50
pages = []
for a, b in zip(before, after):
    assert a["id"] == b["id"]
    pages.append(f'<section><h2>{escape(a["id"])}</h2><div>{panel(a, .54, "Before")}'
                 f'{panel(b, .54, "After")}</div></section>')
(HERE / "comparison.html").write_text('''<!doctype html>
<html lang="en"><meta charset="utf-8"><title>STH Enemy Hitboxes</title>
<style>
:root{color-scheme:dark;font:16px system-ui;background:#10151e;color:#e6edf6}
body{max-width:1120px;margin:32px auto;padding:0 16px} h1{font-size:2rem} h2{font-size:1.05rem}
section{margin:18px 0;padding:0 14px 14px;border:1px solid #344256;border-radius:8px;background:#171f2b}
section div{display:grid;grid-template-columns:1fr 1fr;gap:12px} figure{margin:0}
figcaption,small{display:block;margin:6px 0;color:#c4cbd6}
svg{display:block;width:100%;max-height:265px;background:#111925;border-radius:6px}
.art{fill:none;stroke:#98a5ba;stroke-dasharray:2 4}
.hit{fill:#4bd8d5;fill-opacity:.08;stroke:#4bd8d5;stroke-dasharray:5 3}
.corners{fill:none;stroke:#ffc55a;stroke-width:2.5}
</style>
<h1>STH enemy hitboxes</h1>
<p>Gold corners show the reticle. Cyan marks the hitbox. Dotted gray marks the portrait canvas.
Each pair is recentered on the portrait and shares a scale. Artwork is an offline projection of
the authored controls. Entries with client-only icons show their IDs.</p>
'''+''.join(pages), encoding="utf-8")
