import sys, re, json
from pypdf import PdfReader
from pypdf.generic import ContentStream, DictionaryObject, NameObject

def parse_cmap(data):
    m = {}
    for blk in re.findall(r'beginbfchar(.*?)endbfchar', data, re.S):
        for a, b in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>', blk):
            m[int(a, 16)] = hexs(b)
    for blk in re.findall(r'beginbfrange(.*?)endbfrange', data, re.S):
        for a, b, c in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>', blk):
            s = int(c, 16) if c else 0
            for k in range(int(a, 16), int(b, 16) + 1):
                m[k] = chr(s + k - int(a, 16)) if s else ''
    return m

def hexs(h):
    if not h: return ''
    b = bytes.fromhex(h)
    try: return b.decode('utf-16-be')
    except Exception: return ''

def fonts_of(page):
    out = {}
    res = page.get('/Resources') or {}
    fd = res.get('/Font') or {}
    for name, ref in fd.items():
        f = ref.get_object()
        base = str(f.get('/BaseFont', ''))
        sub = str(f.get('/Subtype'))
        tu = f.get('/ToUnicode')
        cmap = parse_cmap(tu.get_object().get_data().decode('latin1')) if tu else {}
        two = sub == '/Type0'
        out[name] = dict(base=base, cmap=cmap, two=two)
    return out

def text_of(font, raw):
    b = raw if isinstance(raw, bytes) else raw.original_bytes if hasattr(raw, 'original_bytes') else bytes(raw, 'latin1')
    codes = [int.from_bytes(b[i:i+2], 'big') for i in range(0, len(b), 2)] if font['two'] else list(b)
    return codes, ''.join(font['cmap'].get(c, '') for c in codes)

def extract(path):
    r = PdfReader(path)
    pages = []
    for pi, page in enumerate(r.pages):
        fonts = fonts_of(page)
        ops = ContentStream(page.get_contents(), r).operations
        runs = []  # (x, y, size, bold, text)
        stack = []  # actualtext stack entries: [text or None, emitted]
        font = None; size = 0; tm = [1,0,0,1,0,0]; lm = [0,0]
        for operands, op in ops:
            op = op.decode() if isinstance(op, bytes) else op
            if op == 'BDC':
                props = operands[1] if len(operands) > 1 else None
                at = None
                if isinstance(props, DictionaryObject) and '/ActualText' in props:
                    at = str(props['/ActualText'])
                stack.append([at, False])
            elif op == 'BMC':
                stack.append([None, False])
            elif op == 'EMC':
                if stack: stack.pop()
            elif op == 'BT':
                tm = [1,0,0,1,0,0]; lm = [0,0]
            elif op == 'Tf':
                font = fonts.get(operands[0]); size = float(operands[1])
            elif op == 'Tm':
                tm = [float(x) for x in operands]; lm = [tm[4], tm[5]]; cur = list(lm)
            elif op == 'Td':
                lm = [lm[0] + float(operands[0]) * tm[0], lm[1] + float(operands[1]) * tm[3]]
            elif op in ('Tj', "'", '"', 'TJ'):
                if font is None: continue
                arr = operands[0] if op == 'TJ' else [operands[-1]]
                txt = ''
                for item in arr:
                    if isinstance(item, (int, float)): continue
                    codes, t = text_of(font, item)
                    txt += t
                active = next((s for s in reversed(stack) if s[0] is not None), None)
                is_space = 'Arial' in font['base'] and txt.strip() == ''
                if active is not None and not is_space:
                    if active[1]: continue
                    active[1] = True
                    txt = active[0]
                if txt == '​': txt = ''
                if is_space: txt = ' '
                if not txt: continue
                bold = 'Bold' in font['base']
                italic = abs(tm[2]) > 0.05
                runs.append(dict(x=lm[0], y=lm[1], s=size, b=bold, i=italic, t=txt))
        pages.append(runs)
    return pages

if __name__ == '__main__':
    pages = extract(sys.argv[1])
    json.dump(pages, open(sys.argv[2], 'w'), ensure_ascii=False)
    pgs = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else [12]
    for pg in pgs:
        print("=== page", pg+1)
        lines = []; last = None
        for r in pages[pg]:
            if last is None or abs(r['y'] - last) > 2:
                lines.append([]); last = r['y']
            lines[-1].append(r)
        for l in lines:
            print(f"{l[0]['y']:7.1f} x{l[0]['x']:6.1f} s{l[0]['s']:.1f} b{int(any(r['b'] for r in l))} i{int(any(r['i'] for r in l))} |", ''.join(r['t'] for r in l))
