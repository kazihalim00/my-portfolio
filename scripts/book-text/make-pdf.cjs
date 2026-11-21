// Print-ready A5 PDF of a book, laid out by the reader itself so the contents page numbers match the folios.
// usage: npm run build && npx next start -p 3100 &  node scripts/book-text/make-pdf.cjs <slug> <out.pdf>
const { chromium } = require("playwright");
const [slug, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 900 } });
  await p.goto(`http://localhost:3100/read/${slug}?print=1`);
  await p.waitForSelector(".bk-print[data-reader-ready]", { state: "attached", timeout: 90000 });
  await p.evaluate(async () => {
    const root = document.querySelector(".bk-print");
    root.querySelector(":scope > [aria-hidden]")?.remove(); // the hidden measuring copy
    document.body.replaceChildren(root);
    const st = document.createElement("style");
    st.textContent = `@page{size:148mm 210mm;margin:0}
      html,body{margin:0!important;padding:0!important;background:#fff!important}
      .bk-print-page{page-break-after:always;break-after:page}
      .bk-print-page:last-child{page-break-after:auto;break-after:auto}`;
    document.head.appendChild(st);
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
  });
  const n = await p.$$eval(".bk-print-page", (x) => x.length);
  await p.emulateMedia({ media: "print" });
  await p.pdf({ path: out, width: "148mm", height: "210mm", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  console.log(slug, n, "pages ->", out);
  await b.close();
})();
