import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Noto_Serif_Bengali, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const bnSerif = Noto_Serif_Bengali({ subsets: ["bengali"], weight: ["600", "800"], variable: "--font-bn-serif", display: "swap" });
const bn = Hind_Siliguri({ subsets: ["bengali"], weight: ["400", "500", "600"], variable: "--font-bn", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kazi-sunny.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Kazi Sunny | Full Stack Developer (Laravel, Vue, Python)",
  description:
    "Portfolio of Kazi Abdul Halim Sunny: full stack developer building with Laravel, Vue.js, Python and Flutter. Explore projects, play dev games and hunt bugs in an interactive lab.",
  keywords: ["Kazi Sunny", "Full Stack Developer", "Laravel Developer", "Vue.js", "Python", "FastAPI", "QA", "Portfolio", "Sylhet"],
  authors: [{ name: "Kazi Abdul Halim Sunny" }],
  openGraph: {
    title: "Kazi Sunny | Full Stack Developer (Laravel, Vue, Python)",
    description: "Full stack developer (Laravel, Vue, Python). An interactive portfolio: explore projects, play dev games and sign the guestbook.",
    url: siteUrl,
    siteName: "Kazi Sunny",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Kazi Sunny | Full Stack Developer (Laravel, Vue, Python)" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060914" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

// Sets the theme class before paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark'}document.documentElement.classList.toggle('dark',t==='dark')}catch(e){document.documentElement.classList.add('dark')}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${sans.variable} ${display.variable} ${mono.variable} ${bnSerif.variable} ${bn.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
