"""Summarize matched offline sweeps and project captured controls onto a common canvas."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import statistics

from PIL import Image, ImageDraw, ImageFont

SEEDS = {23: "Left-weighted", 63: "Right-weighted", 17: "Centred"}
GLYPHS = {"combat": "C", "elite": "E", "shop": "$", "event": "?", "treasure": "T", "camp": "R", "boss": "B"}


def sweep(directory):
    lines = (directory / "batch.tsv").read_text().splitlines()
    assert lines[-1].startswith("PASS\t")
    rows = [list(map(float, line.split("\t")[1:])) for line in lines if line.startswith("CHECK\t")]
    snapshots = "\n".join(line for line in lines if line.startswith("SNAP\t"))
    assert len(rows) == 384 and len(snapshots.splitlines()) == 384
    assert sum(row[6] for row in rows) == 0
    for row in rows:
        assert row[4] <= 92 and row[5] <= 126
    return rows, snapshots


def measurements(rows):
    return {
        "maps": len(rows),
        "renderFrames": int(sum(row[9] for row in rows)),
        "maxNodes": int(max(row[4] for row in rows)),
        "maxEdges": int(max(row[5] for row in rows)),
        "absoluteMeanX": round(statistics.mean(abs(row[2]) for row in rows), 2),
        "averageSpan": round(statistics.mean(row[3] for row in rows), 2),
        "meanBindMs": round(statistics.mean(row[7] for row in rows) * 1000, 3),
        "meanScrollPaintMs": round(sum(row[8] for row in rows) / sum(row[9] for row in rows) * 1000, 3),
        "examples": {
            str(int(row[0])): {"meanX": round(row[2], 2), "span": round(row[3], 2)}
            for row in rows if row[0] in SEEDS and row[1] == 1
        },
    }


def projection(directory, seed, scale):
    paper = Image.new("RGBA", (253 * 3, 480 * 3), "#929286")
    plane = Image.new("RGBA", paper.size)
    draw = ImageDraw.Draw(plane)
    font = ImageFont.truetype("DejaVuSans-Bold.ttf", 19)
    points = []
    for line in (directory / "draw.tsv").read_text().splitlines():
        tag, key, kind, x, y, first, second, last, tint = line.split("\t")
        if tag != "DRAW" or int(key) != seed:
            continue
        px, py = (126.5 + float(x) * scale) * 3, (375 - float(y) * scale) * 3
        rgba = tuple(map(int, tint.split(",")))
        if kind == "node":
            points.append((px, py - float(second) * scale * 3, GLYPHS[last], float(first), rgba))
        else:
            half = float(second) * scale * 1.5
            dx, dy = half * math.cos(float(first)), -half * math.sin(float(first))
            draw.line((px-dx, py-dy, px+dx, py+dy), fill=rgba, width=max(1, round(float(last)*scale*3)))
    for x, y, label, size, rgba in points:
        radius = min(22, size * scale * .5) * 3
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(193, 193, 176, 255), outline=rgba, width=3)
        draw.text((x, y), label, font=font, fill=rgba, anchor="mm")
    return Image.alpha_composite(paper, plane).resize((253, 480), Image.Resampling.LANCZOS).convert("RGB")


def main():
    parser = argparse.ArgumentParser()
    for argument in ("before", "after", "output"):
        parser.add_argument(argument, type=Path)
    args = parser.parse_args()
    before, original = sweep(args.before)
    after, candidate = sweep(args.after)
    assert original == candidate, "map snapshot or RNG state changed"
    report = {"seedCount": 128, "snapshotSha256": hashlib.sha256(original.encode()).hexdigest(),
              "before": measurements(before), "after": measurements(after)}
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "batch-summary.json").write_text(json.dumps(report, indent=2) + "\n")
    canvas = Image.new("RGB", (1670, 640), "#161A20")
    draw = ImageDraw.Draw(canvas)
    title = ImageFont.truetype("DejaVuSans-Bold.ttf", 27)
    small = ImageFont.truetype("DejaVuSans.ttf", 17)
    draw.text((30, 23), "Act I map layout comparison", font=title, fill="#EEEEEA")
    draw.text((30, 62), "Official profile control geometry. Room labels stand in for SDK textures. Common scale and origin.", font=small, fill="#C6C9CA")
    for column, (seed, label) in enumerate(SEEDS.items()):
        x = 30 + column * 545
        draw.text((x, 102), f"{label}  /  seed {seed}", font=title, fill="#EEEEEA")
        for offset, directory, caption in ((0, args.before, "Before"), (263, args.after, "After")):
            image = projection(directory, seed, .28)
            canvas.paste(image, (x+offset, 143))
            draw.rectangle((x+offset+3, 147, x+offset+80, 172), fill="#26292B")
            draw.text((x+offset+8, 149), caption, font=small, fill="#EEEEEA")
    canvas.save(args.output / "before-after.png")


if __name__ == "__main__":
    main()
