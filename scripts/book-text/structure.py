import json, sys, re
from extract import extract

TERM = tuple('।?!"”’:)।.—…')

def lines_of(runs):
    lines = []; last = None
    for r in runs:
        if last is None or abs(r['y'] - last) > 2:
            lines.append(dict(y=r['y'], x=r['x'], s=r['s'], runs=[])); last = r['y']
        lines[-1]['runs'].append(r)
    return lines

def merge_runs(runs):
    out = []
    for r in runs:
        t = r['t']
        if out and out[-1]['b'] == r['b'] and out[-1]['i'] == r['i']:
            out[-1]['t'] += t
        else:
            out.append(dict(t=t, b=r['b'], i=r['i']))
    for o in out:
        o['t'] = re.sub(r'\s+', ' ', o['t'])
    # space-only runs adopt neighbours' style
    res = []
    for o in out:
        if not o['t'].strip() and res:
            res[-1]['t'] += o['t']; continue
        if res and res[-1]['b'] == o['b'] and res[-1]['i'] == o['i']:
            res[-1]['t'] += o['t']
        else:
            res.append(o)
    for o in res:
        o['t'] = re.sub(r'\s+', ' ', o['t'])
    for a, b in zip(res, res[1:]):
        if a['t'].endswith(' ') and b['t'].startswith(' '):
            b['t'] = b['t'][1:]
    if res:
        res[0]['t'] = res[0]['t'].lstrip(); res[-1]['t'] = res[-1]['t'].rstrip()
    s = []
    for o in res:
        if s and s[-1]['t'].endswith(' ') and o['t'].startswith(' '):
            o['t'] = o['t'][1:]
        s.append(o)
    return [o for o in s if o['t']]

def text(block):
    return ''.join(r['t'] for r in block['runs'])

def build(path):
    import collections
    pages = extract(path)
    S = collections.Counter(); X = collections.Counter()
    for p in pages:
        for l in lines_of(p):
            n = sum(len(r['t']) for r in l['runs']); S[round(l['s'], 1)] += n; X[round(l['x'], 1)] += n
    B = S.most_common(1)[0][0]; BX = X.most_common(1)[0][0]
    fp = next((i for i, p in enumerate(pages) if 'গ্রন্থস্বত্ব' in ''.join(r['t'] for r in p)), 1)
    blocks = []
    for pi, runs in enumerate(pages):
        lines = lines_of(runs)
        cur = None; prev_y = None; first = True
        for ln in lines:
            t = ''.join(r['t'] for r in ln['runs']).strip()
            if not t or re.fullmatch(r'[0-9০-৯]+', t): continue
            s = ln['s']; x = ln['x']; ratio = s / B
            if ratio >= 1.35: kind = 'h1'
            elif ratio >= 1.1: kind = 'h2'
            elif pi <= fp: kind = 'front'
            elif t.startswith('●'): kind = 'li'
            elif ratio < 0.95: kind = 'note'
            elif x > 200: kind = 'right'
            elif 30 <= x - BX <= 50 and kind_prev_ok(): kind = 'quote'
            else: kind = 'p'
            if pi <= fp and kind in ('h1', 'h2'): kind = 'front-' + kind
            gap = (ln['y'] - prev_y) if prev_y is not None else None
            cont = False
            if cur is not None:
                if kind in ('p', 'quote') and cur['type'] == 'li' and abs(x - (BX + 48)) < 3: kind = 'li'
                same = kind == cur['type'] and gap is not None and gap < s * 1.6 and not t.startswith('●')
                if kind in ('front', 'front-h1', 'front-h2', 'right'): same = False
                if kind in ('h1', 'h2'): same = kind == cur['type'] and gap is not None and gap < s * 1.8
                cont = same
            if first and blocks and kind in ('p', 'li', 'quote', 'note'):
                pb = blocks[-1]
                if pb['type'] in ('p', 'li', 'quote', 'note') and not text(pb).rstrip().endswith(TERM) and not t.startswith('●'):
                    if kind == pb['type'] or (pb['type'] == 'li' and kind == 'p'):
                        cur = pb; cont = True
            first = False
            if cont:
                cur['runs'].append(dict(t=' ', b=False, i=False)); cur['runs'] += ln['runs']
            else:
                cur = dict(type=kind, page=pi + 1, runs=list(ln['runs'])); blocks.append(cur)
            prev_y = ln['y']
    for b in blocks:
        b['runs'] = merge_runs(b['runs'])
        if b['type'] == 'li' and b['runs']:
            b['runs'][0]['t'] = b['runs'][0]['t'].lstrip('● ').lstrip()
    blocks = [b for b in blocks if b['runs']]
    out = []; skip = False
    for b in blocks:
        tx = text(b).strip()
        if b['type'] in ('h1', 'h2'):
            skip = tx == 'সূচিপত্র'
        if skip: continue
        if b['type'] == 'h2' and out and out[-1]['type'] == 'h2' and re.match(r'\s*(অধ্যা|পর্ব|পরিচ্ছেদ)', text(out[-1])) and len(text(out[-1]).strip()) < 14:
            out[-1]['label'] = text(out[-1]).strip(); out[-1]['runs'] = b['runs']; continue
        if b['type'] in ('p', 'note') and all(r['b'] for r in b['runs'] if r['t'].strip()) and len(tx) < 90:
            b['type'] = 'h3'
        out.append(b)
    # inside a non-part h1 section (e.g. a conclusion), plain h2s are sub-sections
    sect = None
    for b in out:
        tx = text(b).strip()
        if b['type'] == 'h1': sect = tx
        elif b['type'] == 'h2' and sect and 'খণ্ড' not in sect and not b.get('label') and not tx.startswith(('অধ্যা', 'লেখক পরিচিতি', 'ভূমিকা', 'উৎসর্গ')):
            b['type'] = 'h3'
        if b['type'] == 'h2' and tx.startswith('লেখক পরিচিতি'): b['type'] = 'h1'
    for b in out:
        b['runs'] = [[r['t'], (1 if r['b'] else 0) | (2 if r['i'] else 0)] for r in b['runs']]
        b.pop('page', None)
    return out

def kind_prev_ok():
    return True

if __name__ == '__main__':
    bl = build(sys.argv[1])
    json.dump(bl, open(sys.argv[2], 'w'), ensure_ascii=False, separators=(',', ':'))
    for b in bl[: int(sys.argv[3]) if len(sys.argv) > 3 else 60]:
        print(b['type'], b.get('label', ''), '|', ''.join(r[0] for r in b['runs'])[:110])
