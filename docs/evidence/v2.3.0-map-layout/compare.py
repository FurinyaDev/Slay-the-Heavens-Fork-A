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


def starting_rows(directory):
    sparse = []
    for line in (directory / "batch.tsv").read_text().splitlines():
        if not line.startswith("ENTRY\t"):
            continue
        _, seed, act, lanes, anchors = line.split("\t")
        slots = list(map(int, lanes.split(",")))
        xs = list(map(float, anchors.split(",")))
        if len(slots) <= 3:
            sparse.append((seed, act, slots, xs))
    return {
        "mapsWithTwoOrThreeEntrances": len(sparse),
        "allEntranceColumnsOnOneSide": sum(max(slots)<4 or min(slots)>4 for _, _, slots, _ in sparse),
        "allEntranceAnchorsOnOneSide": sum(max(xs)<0 or min(xs)>0 for _, _, _, xs in sparse),
        "examples": [
            {"seed": seed, "act": act, "lanes": slots, "anchors": xs}
            for seed, act, slots, xs in sparse if (seed, act) in {("4", "1"), ("19", "1"), ("49", "2")}
        ],
    }


def projection(directory, seed, scale, width=253, height=480, origin_y=375):
    paper = Image.new("RGBA", (width * 3, height * 3), "#252925")
    # The official map clips nodes in a wider viewport than the parchment.
    # Keep both physical paper edges visible to expose the route margins.
    paper_left = round((width / 2 - 418.5 * scale) * 3)
    paper_right = round((width / 2 + 419.5 * scale) * 3)
    ImageDraw.Draw(paper).rectangle((paper_left, 0, paper_right, paper.height), fill="#929286")
    plane = Image.new("RGBA", paper.size)
    draw = ImageDraw.Draw(plane)
    font = ImageFont.truetype("DejaVuSans-Bold.ttf", 19)
    points = []
    for line in (directory / "draw.tsv").read_text().splitlines():
        if not line.startswith("DRAW\t"):
            continue
        _, key, kind, x, y, first, second, last, tint = line.split("\t")
        if int(key) != seed:
            continue
        px, py = (width / 2 + float(x) * scale) * 3, (origin_y - float(y) * scale) * 3
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
    return Image.alpha_composite(paper, plane).resize((width, height), Image.Resampling.LANCZOS).convert("RGB")


def comparison_sheet(before, after, before_caption, after_caption, output):
    canvas = Image.new("RGB", (1670, 670), "#161A20")
    draw = ImageDraw.Draw(canvas)
    title = ImageFont.truetype("DejaVuSans-Bold.ttf", 27)
    small = ImageFont.truetype("DejaVuSans.ttf", 17)
    draw.text((30, 23), "Act I map layout comparison", font=title, fill="#EEEEEA")
    draw.text((30, 62), "Same scale and origin. Dark gutters mark the parchment edges. Room labels represent SDK icons.", font=small, fill="#C6C9CA")
    for column, (seed, label) in enumerate(SEEDS.items()):
        x = 30 + column * 545
        draw.text((x, 102), f"{label}  /  seed {seed}", font=title, fill="#EEEEEA")
        for offset, directory, caption in ((0, before, before_caption), (263, after, after_caption)):
            canvas.paste(projection(directory, seed, .28), (x+offset, 176))
            width = round(draw.textlength(caption, font=small)) + 14
            draw.rectangle((x+offset+3, 147, x+offset+3+width, 172), fill="#26292B")
            draw.text((x+offset+8, 149), caption, font=small, fill="#EEEEEA")
    canvas.save(output)


def hover_sample(directory, output):
    lines = (directory / "draw.tsv").read_text().splitlines()
    example = next((line for line in lines if line.startswith("HOVER\t17\t")), None)
    if not example:
        return
    _, _, rim, idle_icon, hover_icon, kind, r, g, b, alpha = example.split("\t")
    assert alpha == "255"
    rim, idle_icon, hover_icon = map(float, (rim, idle_icon, hover_icon))
    canvas = Image.new("RGB", (490, 220), "#161A20")
    draw = ImageDraw.Draw(canvas)
    label = ImageFont.truetype("DejaVuSans.ttf", 16)
    glyph = ImageFont.truetype("DejaVuSans-Bold.ttf", 40)
    draw.text((16, 13), "Available room hover  /  control geometry at 2×", font=label, fill="#EEEEEA")
    for x, caption, icon in ((16, "Idle", idle_icon), (254, "Mouse hover", hover_icon)):
        draw.rectangle((x, 43, x+220, 202), fill="#929286")
        draw.text((x+8, 48), caption, font=label, fill="#17212B")
        cx, cy = x+110, 129
        if caption == "Mouse hover":
            draw.ellipse((cx-rim, cy-rim, cx+rim, cy+rim), outline=(int(r), int(g), int(b)), width=4)
        draw.ellipse((cx-icon, cy-icon, cx+icon, cy+icon), outline="#17212B", width=2)
        draw.text((cx, cy), GLYPHS[kind], font=glyph, fill="#17212B", anchor="mm")
    canvas.save(output)


def entrance_sheet(directory, output):
    scale = .42
    width, height = 385, round(550 * scale)
    canvas = Image.new("RGB", (1210, 325), "#161A20")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype("DejaVuSans.ttf", 19)
    draw.text((15, 12), "Act opening viewport  /  two entrances on their generated columns", font=font, fill="#EEEEEA")
    for index, (seed, caption) in enumerate(((4, "Act I · seed 4 · lanes 1 and 3"),
                                               (19, "Act I · seed 19 · lanes 3 and 5"),
                                               (49, "Act II · seed 49 · lanes 5 and 6"))):
        x = 15 + index * 400
        draw.text((x, 50), caption, font=font, fill="#EEEEEA")
        image = projection(directory, seed, scale, width, height, 242 * scale)
        canvas.paste(image, (x, 79))
    canvas.save(output)


def main():
    parser = argparse.ArgumentParser()
    for argument in ("before", "after", "output"):
        parser.add_argument(argument, type=Path)
    parser.add_argument("--previous-draft", type=Path)
    parser.add_argument("--entrances", type=Path)
    args = parser.parse_args()
    before, original = sweep(args.before)
    after, candidate = sweep(args.after)
    assert original == candidate, "map snapshot or RNG state changed"
    report = {"seedCount": 128, "snapshotSha256": hashlib.sha256(original.encode()).hexdigest(),
              "before": measurements(before), "after": measurements(after),
              "startingRows": starting_rows(args.after)}
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "batch-summary.json").write_text(json.dumps(report, indent=2) + "\n")
    comparison_sheet(args.before, args.after, "Baseline", "Revised draft", args.output / "before-after.png")
    hover_sample(args.after, args.output / "hover.png")
    if args.entrances:
        entrance_sheet(args.entrances, args.output / "entrance-rows.png")
    if args.previous_draft:
        comparison_sheet(args.previous_draft, args.after, "Previous draft", "Revised draft",
                         args.output / "draft-comparison.png")


if __name__ == "__main__":
    main()
