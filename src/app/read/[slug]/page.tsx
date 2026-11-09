import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { books, getBook, penName } from "@/lib/books";
import { Reader } from "@/components/Reader";

export function generateStaticParams() {
  return books.filter((b) => b.pdf).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) return {};
  return {
    title: `${book.title} | ${penName} | Read free`,
    description: `${book.tagline}. ${book.description}`,
    openGraph: { title: `${book.title} · ${penName}`, description: book.tagline, images: book.cover ? [book.cover] : [] },
  };
}

export default async function ReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book || !book.pdf) notFound();
  return <Reader book={book} />;
}
