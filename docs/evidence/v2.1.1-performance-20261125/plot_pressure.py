import argparse
import csv
import json
from pathlib import Path
from statistics import median

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('receipt', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    receipt = json.loads(args.receipt.read_text())
    args.output.mkdir(parents=True, exist_ok=True)
    results = receipt['results']
    roles = {'baseline': 'v2.1.0 source', 'candidate': 'v2.1.1 hotfix source'}
    metrics = {
        'cold_host_ms': ('Cold Host initialization', 'ms'),
        'map_combat_ms': ('First battle entry', 'ms'),
        'combat_turn_ms': ('Combat turn', 'ms'),
        'idle_update_ms': ('Mean idle update within each sample', 'ms/update'),
        'deck_roundtrip_ms': ('Deck open + close', 'ms'),
        'peak_mib': ('Container peak memory', 'MiB'),
        'cpu_ms': ('Total container CPU time', 'ms'),
        'success_percent': ('Completed workload', '%'),
    }
    series = {}
    profiles = list(results)
    rows = []
    for profile, result in results.items():
        for role in roles:
            sample_rows = []
            for index, sample in enumerate(result[role]['samples'], start=1):
                row = {'profile': profile, 'source': role, 'sample': index, 'pass': 'error' not in sample}
                if not row['pass']:
                    row['error'] = sample['error']
                else:
                    phase = {entry['phase']: entry for entry in sample['rows']}
                    resources = sample['resources']
                    row.update({
                        'cold_host_ms': phase['cold-host']['elapsedMs'],
                        'map_combat_ms': phase['map-combat']['elapsedMs'],
                        'combat_turn_ms': phase['combat-turn']['elapsedMs'],
                        'idle_update_ms': phase['idle-300']['elapsedMs'] / receipt['idleFrames'],
                        'deck_roundtrip_ms': phase['deck-roundtrip']['elapsedMs'],
                        'peak_mib': resources['peakBytes'] / 2**20,
                        'cpu_ms': resources['cpuUsageUsec'] / 1_000,
                        'wall_ms': sample['wallMs'],
                        'cpu_max': resources['cpuMax'],
                        'memory_max': resources['memoryMax'],
                        'swap_max': resources['swapMax'],
                        'throttled_periods': resources['throttledPeriods'],
                        'oom': resources['oom'],
                        'oom_kill': resources['oomKill'],
                    })
                sample_rows.append(row)
                rows.append(row)
            for metric in metrics:
                if metric == 'success_percent':
                    values = [100 * sum(row['pass'] for row in sample_rows) / len(sample_rows)]
                else:
                    values = [row[metric] for row in sample_rows if row['pass']]
                if values:
                    series[profile, role, metric] = (median(values), min(values), max(values))
    fields = dict.fromkeys(key for row in rows for key in row)
    with (args.output / 'resource-pressure.csv').open('w', newline='') as raw:
        writer = csv.DictWriter(raw, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    with (args.output / 'resource-pressure-summary.csv').open('w', newline='') as summarized:
        writer = csv.writer(summarized)
        writer.writerow(['profile', 'source', 'metric', 'p50', 'min', 'max'])
        for (profile, role, metric), values in series.items():
            writer.writerow([profile, role, metric, *values])
    plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'svg.fonttype': 'none'})
    figure, axes = plt.subplots(4, 2, figsize=(13, 12), layout='constrained')
    for axis, (metric, (title, unit)) in zip(axes.flat, metrics.items()):
        for index, (role, label) in enumerate(roles.items()):
            points = [(i, series[profile, role, metric]) for i, profile in enumerate(profiles)
                      if (profile, role, metric) in series]
            ticks = [i + (-0.055 if index == 0 else 0.055) for i, _ in points]
            middle = [value[0] for _, value in points]
            minimum = [value[0] - value[1] for _, value in points]
            maximum = [value[2] - value[0] for _, value in points]
            axis.errorbar(ticks, middle, yerr=[minimum, maximum], marker=['o', 's'][index],
                          color=['#36558f', '#008173'][index], capsize=3, linewidth=1.5, label=label)
        axis.set(title=title, ylabel=unit, xticks=range(len(profiles)), xticklabels=profiles)
        axis.grid(axis='y', alpha=.24)
        axis.spines[['top', 'right']].set_visible(False)
        if metric == 'success_percent':
            axis.set_ylim(0, 108)
    axes[0, 0].legend(loc='best', frameon=False)
    figure.suptitle('Resource sensitivity in offline Host · median and observed range\n'
                    f'{receipt["repetitions"]} paired rounds per tier · fixed seed {receipt["seed"]} · '
                    'Linux cgroup v2 · no mobile timing inference', fontsize=14)
    figure.savefig(args.output / '05-resource-sensitivity.svg')


if __name__ == '__main__':
    main()
