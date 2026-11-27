"""Render map geometry captured from the real Lua controller on native control doubles."""

import json
import math
import sys
from pathlib import Path
from statistics import median

from PIL import Image, ImageDraw, ImageFont


def capture(path):
    payload = Path(path).read_text(encoding='utf-8').split('OFFICIAL_VISUAL_SCENES ', 1)[1]
    return {scene['name']: scene for scene in json.loads(payload)}


def map_controls(scene):
    panel = next(node for node in scene['tree']['children'] if node['name'] == 'mapPanel')
    return [node for group in panel['children'] if group['name'].startswith('mapGroup')
            for node in group['children'] if node.get('visible', True)]


def measures(controls, mobile):
    nodes = [(node, next(child for child in node['children'] if child['name'] == 'icon'))
             for node in controls if node['name'].startswith('node')]
    boss, emblem = nodes[-1]
    camp_y = max(node['position'][1] for node, _ in nodes[:-1])
    locked_camps = [icon['size'][0] for node, icon in nodes[:-1]
                    if node['position'][1] == camp_y and icon['size'][0] < 30]
    width = emblem['size'][0]
    normal = median(locked_camps)
    return {'image': emblem['image'], 'emblemWidth': width, 'normalWidth': normal,
            'ratio': round(width / normal, 2), 'paperWidthPercent': round(width / 838 * 100, 2),
            'bossToCampCentres': boss['position'][1] - camp_y,
            'viewportTopClearance': round((168 if mobile else 242) - boss['position'][1] - width / 2, 2)}


def draw_map(draw, controls, x, y, label):
    scale = .64
    left, top, width, height = x, y, 532, 319
    draw.rectangle((left, top, left + width, top + height), fill='#929286')
    draw.line((left, top + 1, left + width, top + 1), fill='#53615B', width=2)

    def point(px, py):
        return left + width / 2 + px * scale, top + (242 - py) * scale

    for edge in (node for node in controls if node['name'].startswith('edge')):
        angle = math.radians(edge['rotation'])
        ex, ey = edge['position']
        for dash in (node for node in edge['children'] if node.get('visible', True)):
            x0, y0 = dash['position']
            px = ex + x0 * math.cos(angle) - y0 * math.sin(angle)
            py = ey + x0 * math.sin(angle) + y0 * math.cos(angle)
            half = dash['size'][0] / 2
            theta = angle + math.radians(dash['rotation'])
            dx, dy = half * math.cos(theta), half * math.sin(theta)
            endpoints = [point(px - dx, py - dy), point(px + dx, py + dy)]
            if all(a >= top and a <= top + height for _, a in endpoints):
                draw.line(endpoints, fill='#4D5856', width=1)

    for box in (node for node in controls if node['name'].startswith('node')):
        icon = next(child for child in box['children'] if child['name'] == 'icon')
        px, py = point(*box['position'])
        half = icon['size'][0] * scale / 2
        if py + half > top + height:
            continue
        bounds = (px - half, py - half, px + half, py + half)
        if icon['image'] >= 112000:
            draw.rectangle(bounds, fill='#677574', outline='#26363C', width=2)
            draw.text((px, py), f"SDK {icon['image']}", font=ImageFont.load_default(12),
                      fill='#FFFFFF', anchor='mm')
        else:
            draw.ellipse(bounds, fill='#485655')
    draw.text((left + 10, top + 11), label, fill='#17212B', font=ImageFont.load_default(14))


def main(before_path, after_path, out):
    stages = {'before': capture(before_path), 'after': capture(after_path)}
    assert stages['before'].keys() == stages['after'].keys()
    image = Image.new('RGB', (1112, 730), '#E6E8E1')
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(15)
    draw.text((16, 14), 'Two-act map end | Seed 42, same viewport and terminal scroll', fill='#17212B', font=font)
    results = {}
    for column, (stage, scenes) in enumerate(stages.items()):
        results[stage] = {}
        for name, scene in scenes.items():
            mobile = name.endswith('-touch')
            controls = map_controls(scene)
            results[stage][name] = measures(controls, mobile)
            if not mobile:
                act = int(name[3])
                draw_map(draw, controls, 16 + column * 548, 42 + (act - 1) * 328,
                         f'Act {act}  /  {stage.capitalize()}')
    draw.text((16, 701), 'Lua control projection. Symbols and SDK boxes indicate recorded positions and sizes.',
              fill='#425251', font=font)
    out = Path(out)
    image.save(out / 'comparison.png', optimize=True)
    (out / 'measurements.json').write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main(*sys.argv[1:])
