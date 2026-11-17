"""Reproduce the round 4 results (Table 2 of the paper) from round-4.csv.

    pip install scipy
    python3 analyse_round_4.py

Participants without a completion code count as not having completed any task.
Proportions: Fisher's exact test (two-sided). Ratings and times: Mann-Whitney U
(two-sided). Time to finish the moves ranks people who never finished all five
as slowest.
"""
import csv
import math
from pathlib import Path
from statistics import mean, median

from scipy.stats import fisher_exact, mannwhitneyu

CONDITIONS = ['A4', 'S4', 'W4']


def parse(code):
    """Turn a completion code into a dict of its fields."""
    parts = code.split('-')
    fields = {'tasks': parts[1]}
    for part in parts[2:]:
        fields[part[0]] = part[1:]
    fields['t'] = [None if v == 'x' else int(v) for v in fields['t'].split('.')]
    return fields


def load():
    groups = {c: [] for c in CONDITIONS}
    with open(Path(__file__).with_name('round-4.csv'), newline='') as f:
        for row in csv.DictReader(f):
            row['code'] = parse(row['completion_code']) if row['completion_code'] else None
            row['move'] = int(row['move_ease_1to7'])
            row['edit'] = int(row['edit_ease_1to7'])
            groups[row['condition']].append(row)
    return groups


def summarise(rows):
    codes = [r['code'] for r in rows]
    got = [c for c in codes if c]
    all5 = [bool(c and c['tasks'][:5] == '11111') for c in codes]
    return {
        'n': len(rows),
        'codes': len(got),
        'all5': sum(all5),
        'task2': sum(1 for c in got if c['tasks'][1] == '1'),
        'moves_right': [sum(x == '1' for x in c['tasks'][:5]) if c else 0 for c in codes],
        'both_edits': sum(1 for c in got if c['tasks'][5:] == '11'),
        't_moves': [max(c['t'][:5]) if done else math.inf for c, done in zip(codes, all5)],
        'finished': [int(c['s']) for c in got],
        'move': [r['move'] for r in rows],
        'edit': [r['edit'] for r in rows],
        'unintended': sum(r['moved_unintentionally'] == 'Yes' for r in rows),
        'failed_drag_people': sum(1 for c in got if int(c['m']) > 0),
        'failed_drags': sum(int(c['m']) for c in got),
        'arrows_only': sum(1 for c in got if int(c['a']) > 0 and c['d'] == '0' and c['b'] == '0'),
        'move_to': sum(1 for c in got if int(c['o']) > 0),
        'dropped_in_place': sum(1 for c in got if int(c['z']) > 0),
    }


def fisher(a, b, n=20):
    return fisher_exact([[b, n - b], [a, n - a]])[1]


def mwu(a, b):
    return mannwhitneyu(b, a, alternative='two-sided')[1]


def fmt(p):
    return '<.001' if p < 0.001 else f'{p:.3f}'


def main():
    s = {c: summarise(rows) for c, rows in load().items()}
    a = s['A4']
    print(f"{'Measure':44}" + ''.join(f'{c:>10}' for c in CONDITIONS) + f"{'p S4':>9}{'p W4':>9}")

    def line(label, key, test=None, show=lambda v: v):
        values = ''.join(f'{show(s[c][key])!s:>10}' for c in CONDITIONS)
        ps = ''.join(f'{fmt(test(a[key], s[c][key])):>9}' for c in ('S4', 'W4')) if test else ''
        print(f'{label:44}{values}{ps}')

    line('Returned a completion code', 'codes')
    line('All five moves right', 'all5', fisher)
    line('Move into a column (task 2) right', 'task2', fisher)
    line('Mean moves right (of 5)', 'moves_right', mwu, lambda v: f'{mean(v):.2f}')
    line('Median time to finish the moves (s)', 't_moves', mwu,
         lambda v: f"{math.floor(median([x for x in v if x != math.inf]) + 0.5)}")
    line('Median time to Finished (s)', 'finished', mwu, lambda v: f'{math.floor(median(v) + 0.5)}')
    line('Moving ease, mean (1-7)', 'move', mwu, lambda v: f'{mean(v):.2f}')
    line('Made a failed drag attempt', 'failed_drag_people')
    line('Failed drag attempts, total', 'failed_drags')
    line('Arrows only, never dragged a text block', 'arrows_only')
    line('Looked at Move to or List View', 'move_to')
    line('Both edits right', 'both_edits', fisher)
    line('Editing ease, mean (1-7)', 'edit', mwu, lambda v: f'{mean(v):.2f}')
    line('Said something moved unintentionally', 'unintended', fisher)
    line('Picked up a block and dropped it in place', 'dropped_in_place', fisher)


if __name__ == '__main__':
    main()
