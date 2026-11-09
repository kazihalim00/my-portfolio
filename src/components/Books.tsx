"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Download } from "lucide-react";
import { books, penName, type Book } from "@/lib/books";
import { Reveal, Section } from "./ui";
import { load } from "./Providers";

/** A 3D-ish book with a spine. Uses the cover image, or a typographic cover when none exists. */
export function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  return (
    <div className={`group/book relative aspect-[1/1.417] [perspective:1200px] ${className}`}>
      <div className="relative h-full w-full rounded-r-md shadow-[8px_12px_30px_rgba(0,0,0,.45)] transition-transform duration-500 [transform-style:preserve-3d] group-hover/book:[transform:rotateY(-14deg)]">
        {book.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover} alt={`${book.title} cover`} loading="lazy" className="h-full w-full rounded-r-md object-cover" />
        ) : (
          <div
            className="flex h-full w-full flex-col justify-between rounded-r-md p-[9%]"
            style={{ background: `linear-gradient(160deg, ${book.coverStyle?.from}, ${book.coverStyle?.to})`, color: book.coverStyle?.ink }}
          >
            <span className="text-[0.6em] uppercase tracking-[0.25em] opacity-70">{book.genre}</span>
            <div>
              <p className="font-display text-[1.5em] font-bold leading-tight">{book.title}</p>
              <div className="my-[6%] h-px w-1/3 bg-current opacity-50" />
              <p className="text-[0.65em] opacity-80">{book.publisher}</p>
            </div>
            <p className="font-bn text-[0.75em] font-medium">{penName}</p>
          </div>
        )}
        {/* spine + page edge */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[6%] rounded-l-sm bg-gradient-to-r from-black/45 via-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-y-[1.5%] -right-[3%] w-[3%] rounded-r-sm bg-[repeating-linear-gradient(90deg,#f3efe6_0,#f3efe6_1px,#d8d2c4_1px,#d8d2c4_2px)]" />
      </div>
    </div>
  );
}

function ReadProgress({ slug, pages }: { slug: string; pages?: number }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(load<number>(`read:${slug}`, 0)), [slug]);
  if (!page || !pages || page < 2) return null;
  return (
    <div className="mt-3">
      <div className="h-1 overflow-hidden rounded-full bg-fg/10">
        <div className="h-full bg-brand" style={{ width: `${Math.min(100, (page / pages) * 100)}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted">
        You stopped at page {page} of {pages}
      </p>
    </div>
  );
}

export function Books() {
  const free = books.filter((b) => b.pdf);
  const print = books.filter((b) => !b.pdf);

  return (
    <Section
      id="books"
      eyebrow="07 · Writing"
      title={
        <>
          Beyond code, <span className="gradient-text">I write books</span>.
        </>
      }
      intro={
        <>
          Five Bangla books under my pen name <span className="font-bn font-medium text-fg">{penName}</span>: three in print since
          2018, and two you can read free, right here.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {free.map((b, i) => (
          <Reveal key={b.slug} delay={i * 0.08}>
            <div className="card flex h-full flex-col gap-6 p-6 sm:flex-row">
              <Link href={`/read/${b.slug}`} className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-44" aria-label={`Read ${b.title}`}>
                <BookCover book={b} className="text-[13px]" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip border-brand/30 bg-brand/10 text-brand">{b.badge}</span>
                  <span className="text-xs text-muted">{b.genre}</span>
                </div>
                <h3 className="mt-3 font-bnserif text-3xl font-extrabold leading-tight">{b.title}</h3>
                <p className="mt-1 font-bn text-sm text-muted">{b.tagline}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{b.description}</p>
                <p className="mt-3 text-xs text-muted">
                  {b.pages} pages · {b.date}
                </p>
                <ReadProgress slug={b.slug} pages={b.pages} />
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <Link href={`/read/${b.slug}`} className="btn-primary">
                    <BookOpen size={15} /> Read free
                  </Link>
                  <a href={b.pdf} download className="btn-ghost">
                    <Download size={15} /> PDF
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <h3 className="mb-5 mt-14 font-display text-xl font-semibold">In print</h3>
      </Reveal>
      <div className="grid gap-6 sm:grid-cols-3">
        {print.map((b, i) => (
          <Reveal key={b.slug} delay={i * 0.08}>
            <div className="card flex h-full flex-col p-5">
              <BookCover book={b} className="mx-auto w-36 text-[12px]" />
              <p className="mt-5 font-mono text-xs text-muted">
                {b.year} · {b.publisher}
              </p>
              <h4 className="mt-1 font-bnserif text-xl font-bold">{b.title}</h4>
              {b.titleEn && <p className="text-xs text-muted">{b.titleEn}</p>}
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{b.description}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {b.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                    {l.label} <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
