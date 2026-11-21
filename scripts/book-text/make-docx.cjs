// Word manuscript of a book for the publisher, built from public/books/text/<slug>.json.
// Footnotes become real Word footnotes. usage: node scripts/book-text/make-docx.cjs <slug> <out.docx>
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, FootnoteReferenceRun, AlignmentType, HeadingLevel, PageBreak,
  Footer, PageNumber, LevelFormat, BorderStyle, TabStopType, LineRuleType,
} = require("docx");

const [slug, out] = process.argv.slice(2);
const blocks = JSON.parse(fs.readFileSync(path.join(__dirname, "../../public/books/text", `${slug}.json`), "utf8"));
const META = {
  "paper-addopanto": { title: "পাপের আদ্যপান্ত", tagline: "যে অন্ধকার গ্রাস করছে আমাদের দুনিয়া ও আখিরাত" },
  pretend: { title: "প্রিটেন্ড", tagline: "আত্মপ্রবঞ্চনার দেয়াল এবং ফিরে আসার গল্প" },
}[slug];
const AUTHOR = "কাজী আব্দুল হালিম সানী";
const FONT = "Noto Serif Bengali";
const ACCENT = "0F766E";
const MUTED = "6B6458";
const YA = "য়";
const nk = (s) => s.replace(/য়/g, YA);
const CHAPTER_RE = new RegExp(`^অধ্যা${YA}\\s*([০-৯]+)`);
const bn = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const body = blocks.filter((b) => b.type !== "front-h1" && b.type !== "front-h2");
const plain = (b) => b.runs.filter((r) => !(r[1] & 4)).map((r) => r[0]).join("");
const isHead = (b) => b && (b.type === "h1" || b.type === "h2");

function headParts(b) {
  const text = b.runs.filter((r) => !(r[1] & 4)).map((r) => r[0]).join("");
  let label = b.label;
  let title = text;
  if (!label) {
    const m = text.match(/^\s*([^:：]{2,16}?)\s*[:：]\s*(?=\S)/);
    if (m) {
      label = m[1];
      title = text.slice(m[0].length);
    }
  }
  let sub;
  const sm = title.match(/\s*\(([A-Za-z][^()]*)\)\s*$/);
  if (sm && sm.index > 0) {
    sub = sm[1];
    title = title.slice(0, sm.index);
  }
  return { label: label && nk(label), title: title.trim(), sub };
}

// ---- structure (same rules as the site reader)
let k = 0;
while (k < body.length && body[k].type === "front") k++;
const frontEnd = k;
let ded = null;
let tocSrc = null;
for (;;) {
  const b = body[k];
  if (!isHead(b)) break;
  const t = plain(b).trim();
  let e = k + 1;
  while (e < body.length && !isHead(body[e])) e++;
  if (t === "উৎসর্গ") ded = [k, e];
  else if (t.startsWith("সূচিপত্র")) tocSrc = [k, e];
  else break;
  k = e;
}
const mainStart = k;

// ---- text helpers
const run = (text, o = {}) => new TextRun({ text, font: { ascii: FONT, hAnsi: FONT, cs: FONT }, ...o });
const footnotes = {};
let fnId = 0;
function runsOf(b, base = {}) {
  const out = [];
  for (const [t, f] of b.runs) {
    if (f & 4) {
      fnId++;
      footnotes[fnId] = {
        children: [new Paragraph({ alignment: AlignmentType.BOTH, spacing: { after: 40 }, children: [run(t, { size: 18, sizeComplexScript: 18 })] })],
      };
      out.push(new FootnoteReferenceRun(fnId));
    } else out.push(run(t, { bold: !!(f & 1) || base.bold, color: f & 2 ? ACCENT : base.color, size: base.size, sizeComplexScript: base.size }));
  }
  return out;
}
const P = (children, o = {}) => new Paragraph({ children, ...o });
const blank = (n = 1) => Array.from({ length: n }, () => P([run("")]));
const pageBreak = () => P([new PageBreak()]);

// ---- front matter
const front = [];
front.push(...blank(6));
front.push(P([run(META.title, { bold: true, size: 56, sizeComplexScript: 56 })], { alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
front.push(P([run(META.tagline, { color: MUTED, size: 24, sizeComplexScript: 24 })], { alignment: AlignmentType.CENTER, spacing: { after: 800 } }));
front.push(P([run(AUTHOR, { bold: true, size: 28, sizeComplexScript: 28 })], { alignment: AlignmentType.CENTER }));
front.push(pageBreak());

// imprint: label / value rows
const LABELS = ["জনরা", "লেখক", "গ্রন্থস্বত্ব", "প্রকাশকাল", "প্রচ্ছদ", "অক্ষরবিন্যাস ও সম্পাদনা", "যোগাযোগ", "মূল্য"];
const rows = [];
const pre = [];
for (const b of body.slice(0, frontEnd)) {
  const t = plain(b).trim();
  if (LABELS.includes(t)) rows.push({ label: t, lines: [] });
  else if (rows.length) rows[rows.length - 1].lines.push(t);
  else pre.push(t);
}
const get = (l) => (rows.find((r) => r.label === l) || { lines: [] }).lines;
const row = (l, v) =>
  v &&
  P([run(l + ":", { bold: true, color: MUTED, size: 20, sizeComplexScript: 20 }), run("\t"), run(v, { size: 20, sizeComplexScript: 20 })], {
    tabStops: [{ type: TabStopType.LEFT, position: 2400 }],
    indent: { left: 2400, hanging: 2400 },
    spacing: { after: 120 },
  });
front.push(P([run(pre[0] || META.title, { bold: true, size: 30, sizeComplexScript: 30 })], { spacing: { after: 60 } }));
front.push(P([run(pre[1] || META.tagline, { color: MUTED, size: 20, sizeComplexScript: 20 })], { spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 8 } } }));
const rights = get("গ্রন্থস্বত্ব");
[
  row("লেখক", get("লেখক").join(" ") || AUTHOR),
  row("জনরা", get("জনরা").join(" ")),
  row("গ্রন্থস্বত্ব", rights[0] ? `© ${rights[0]}` : ""),
  ...get("প্রকাশকাল").map((l) => {
    const [a, ...v] = l.split(/[:：]\s*/);
    return v.length ? row(a, v.join(": ")) : row("প্রকাশকাল", l);
  }),
  row("প্রচ্ছদ", get("প্রচ্ছদ").join(" ")),
  row("অক্ষরবিন্যাস ও সম্পাদনা", get("অক্ষরবিন্যাস ও সম্পাদনা").join(" ")),
  row("যোগাযোগ", get("যোগাযোগ").join(" ").replace(/^ইমেইল[:：]\s*/, "")),
  row("মূল্য", get("মূল্য").join(" ")),
]
  .filter(Boolean)
  .forEach((p) => front.push(p));
const notice = rights.slice(1).join(" ").replace(/^\(|\)$/g, "");
if (notice) front.push(P([run(notice, { color: MUTED, size: 18, sizeComplexScript: 18 })], { spacing: { before: 600 } }));
front.push(pageBreak());

// dedication
if (ded) {
  front.push(...blank(3));
  front.push(P([run("উৎসর্গ", { bold: true, size: 30, sizeComplexScript: 30 })], { alignment: AlignmentType.CENTER, spacing: { after: 400 } }));
  for (const b of body.slice(ded[0] + 1, ded[1])) {
    const t = plain(b).trim();
    const m = t.length < 50 ? t.match(/^([^,]{2,20}),\s*(.+?)[।.]?$/) : null;
    if (m) {
      front.push(P([run(m[1], { color: MUTED, size: 20, sizeComplexScript: 20 })], { alignment: AlignmentType.CENTER, spacing: { before: 200 } }));
      front.push(P([run(m[2], { bold: true, color: ACCENT, size: 30, sizeComplexScript: 30 })], { alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
    } else if (t === "এবং") front.push(P([run("— এবং —", { color: MUTED })], { alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
    else front.push(P(runsOf(b), { alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
  }
  front.push(pageBreak());
}

// contents (no page numbers: the publisher's layout sets them)
const desc = {};
if (tocSrc) {
  let cur = "";
  for (let i = tocSrc[0] + 1; i < tocSrc[1]; i++) {
    const t = nk(plain(body[i])).trim();
    const m = t.match(CHAPTER_RE);
    if (m) cur = m[1];
    else if (body[i].type === "li" && cur) (desc[cur] = desc[cur] || []).push(t);
    else if (body[i].type !== "li") cur = "";
  }
}
front.push(P([run("সূচিপত্র", { bold: true, size: 32, sizeComplexScript: 32 })], { alignment: AlignmentType.CENTER, spacing: { after: 360 } }));
for (let i = mainStart; i < body.length; i++) {
  const b = body[i];
  if (!isHead(b)) continue;
  const h = headParts(b);
  if (b.type === "h1" && h.label && /খণ্ড/.test(h.label)) {
    front.push(P([run(h.label, { color: ACCENT, size: 18, sizeComplexScript: 18, bold: true })], { spacing: { before: 240 } }));
    front.push(P([run(h.title, { bold: true })], { spacing: { after: 80 } }));
    continue;
  }
  const cm = h.label && h.label.match(CHAPTER_RE);
  if (cm) {
    front.push(P([run(cm[1] + ".", { bold: true, color: ACCENT }), run("\t"), run(h.title)], { tabStops: [{ type: TabStopType.LEFT, position: 400 }], indent: { left: 400, hanging: 400 }, spacing: { after: 40 } }));
    if (desc[cm[1]]) front.push(P([run(desc[cm[1]].join(" "), { color: MUTED, size: 18, sizeComplexScript: 18 })], { indent: { left: 400 }, spacing: { after: 120 } }));
  } else front.push(P([run(h.label ? `${h.label}: ${h.title}` : h.title, { bold: true })], { spacing: { before: 120, after: 80 } }));
}

// ---- main text
const main = [];
let first = true;
for (let i = mainStart; i < body.length; i++) {
  const b = body[i];
  const prev = body[i - 1];
  if (isHead(b)) {
    const h = headParts(b);
    const part = b.type === "h1" && h.label && /খণ্ড/.test(h.label);
    if (!first) main.push(pageBreak());
    first = false;
    if (part) {
      main.push(...blank(8));
      main.push(P([run(h.label, { color: ACCENT, bold: true })], { alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
      main.push(P([run(h.title, { bold: true, size: 36, sizeComplexScript: 36 })], { heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
      if (h.sub) main.push(P([run(h.sub, { italics: true, color: MUTED, size: 20 })], { alignment: AlignmentType.CENTER }));
      // a short part introduction stays on the part page
      let e = i + 1;
      while (e < body.length && body[e].type === "p") e++;
      const intro = body.slice(i + 1, e);
      if (intro.length && intro.reduce((n, x) => n + plain(x).length, 0) < 420) {
        intro.forEach((x) => main.push(P(runsOf(x, { color: MUTED }), { alignment: AlignmentType.CENTER, spacing: { before: 300 } })));
        i = e - 1;
      }
      first = false;
      main.push(pageBreak());
      first = true; // the chapter after a part page starts on the next page already
      continue;
    }
    main.push(...blank(3));
    const cm = h.label && h.label.match(/^(.*?)\s*([০-৯0-9]+)$/);
    if (h.label)
      main.push(
        P(cm ? [run(cm[1], { color: ACCENT, size: 20, sizeComplexScript: 20 }), run(" " + cm[2], { color: ACCENT, bold: true, size: 40, sizeComplexScript: 40 })] : [run(h.label, { color: ACCENT, size: 22, sizeComplexScript: 22 })], {
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        })
      );
    main.push(P([run(h.title, { bold: true, size: 32, sizeComplexScript: 32 })], { heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { after: h.sub ? 60 : 480 } }));
    if (h.sub) main.push(P([run(h.sub, { italics: true, color: MUTED, size: 20 })], { alignment: AlignmentType.CENTER, spacing: { after: 480 } }));
    continue;
  }
  first = false;
  const afterHead = isHead(prev) || !prev || prev.type !== "p";
  switch (b.type) {
    case "h3":
      main.push(P(runsOf(b, { bold: true }), { heading: HeadingLevel.HEADING_3, spacing: { before: 280, after: 100 }, keepNext: true }));
      break;
    case "li":
      main.push(P(runsOf(b), { numbering: { reference: "bullets", level: 0 }, alignment: AlignmentType.BOTH, spacing: { after: 60 } }));
      break;
    case "quote":
      main.push(
        isHead(prev)
          ? P(runsOf(b, { color: MUTED }), { alignment: AlignmentType.CENTER, indent: { left: 567, right: 567 }, spacing: { after: 400 } })
          : P(runsOf(b), { indent: { left: 567, right: 340 }, spacing: { before: 120, after: 160 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 } } })
      );
      break;
    case "note":
      main.push(P(runsOf(b, { size: 19, color: MUTED }), { spacing: { after: 60 } }));
      break;
    case "right":
      main.push(P(runsOf(b, { color: MUTED }), { alignment: AlignmentType.RIGHT, spacing: { before: prev && prev.type === "right" ? 0 : 240 } }));
      break;
    case "row": {
      const [n, title, kind] = b.runs.map((r) => r[0]);
      main.push(P([run(n, { bold: true, color: ACCENT }), run("\t"), run(title, { bold: true }), run(kind ? " " + kind : "", { color: MUTED, size: 20, sizeComplexScript: 20 })], { tabStops: [{ type: TabStopType.LEFT, position: 500 }], spacing: { after: 80 } }));
      break;
    }
    default:
      main.push(P(runsOf(b), { alignment: AlignmentType.BOTH, indent: afterHead ? undefined : { firstLine: 400 } }));
  }
}

const A5 = { width: 8391, height: 11906 };
const margin = { top: 1080, bottom: 1080, left: 1000, right: 900, header: 500, footer: 500, gutter: 0 };
const doc = new Document({
  creator: AUTHOR,
  title: META.title,
  styles: {
    default: { document: { run: { font: { ascii: FONT, hAnsi: FONT, cs: FONT }, size: 22, sizeComplexScript: 22 }, paragraph: { spacing: { line: 336, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 36, bold: true }, paragraph: { spacing: { before: 0, after: 200 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 32, bold: true }, paragraph: { spacing: { before: 0, after: 400 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "◆", alignment: AlignmentType.LEFT, style: { run: { color: ACCENT, size: 14 }, paragraph: { indent: { left: 500, hanging: 300 } } } }] }] },
  footnotes,
  sections: [
    { properties: { page: { size: A5, margin } }, children: front },
    {
      properties: { page: { size: A5, margin, pageNumbers: { start: 1 } } },
      footers: { default: new Footer({ children: [P([run("", {}), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: MUTED })], { alignment: AlignmentType.CENTER })] }) },
      children: main,
    },
  ],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log(slug, "->", out, "footnotes:", fnId);
});
