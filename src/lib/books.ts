// Books by Kazi Abdul Halim Sunny (pen name: কাজী আব্দুল হালিম সানী)

export type Chapter = { title: string; page: number };

export type Book = {
  slug: string;
  title: string; // shown on the card
  titleBn?: string; // Bangla title when known
  titleEn?: string; // transliteration shown under Bangla titles
  tagline: string;
  publisher: string;
  date: string;
  year: number;
  genre: string;
  description: string;
  cover?: string;
  coverStyle?: { from: string; to: string; ink: string }; // generated cover when no image
  pdf?: string; // free to read on the site
  pages?: number;
  toc?: Chapter[];
  links: { label: string; href: string }[];
  badge?: string;
};

export const penName = "কাজী আব্দুল হালিম সানী";

export const books: Book[] = [
  {
    slug: "paper-addopanto",
    title: "পাপের আদ্যপান্ত",
    titleBn: "পাপের আদ্যপান্ত",
    tagline: "যে অন্ধকার গ্রাস করছে আমাদের দুনিয়া ও আখিরাত",
    publisher: "Online edition (free)",
    date: "January 2026",
    year: 2026,
    genre: "Islamic self-purification · Contemporary issues",
    description:
      "An X-ray of how sin works: from Iblis's first sin and Shaytan's step-by-step 'algorithm', to the neuroscience of addiction, hidden traps for practicing Muslims, digital-age sins, diseases of the heart and, finally, the road back through sincere tawbah. 18 chapters in 7 parts.",
    cover: "/books/papp-cover.jpg",
    pdf: "/books/Paper-Addopanto-Kazi-Abdul-Halim-Sani.pdf",
    pages: 54,
    badge: "New · Free",
    toc: [
      { title: "প্রচ্ছদ", page: 1 },
      { title: "সূচিপত্র ও অধ্যায় বিন্যাস", page: 5 },
      { title: "লেখকের কথা", page: 8 },
      { title: "অধ্যায় ১: ইবলিস—প্রথম পাপটি কিন্তু ‘জিনা’ বা ‘খুন’ ছিল না", page: 11 },
      { title: "অধ্যায় ২: শয়তানের অ্যালগরিদম", page: 14 },
      { title: "অধ্যায় ৩: পাপের নিউরো-সায়েন্স", page: 17 },
      { title: "অধ্যায় ৪: ইসলামিক লাভ স্টোরি—শয়তানের সবচেয়ে বড় ধোঁকা", page: 20 },
      { title: "অধ্যায় ৫: চোখের পর্দা বনাম মনের পর্দা", page: 23 },
      { title: "অধ্যায় ৬: দাওয়াতি কাজের নামে ফ্রি-মিক্সিং", page: 27 },
      { title: "অধ্যায় ৭: প্রাইভেট ব্রাউজিং", page: 29 },
      { title: "অধ্যায় ৮: ভাইরালিটি ও ইজ্জতের নিলাম", page: 32 },
      { title: "অধ্যায় ৯: জিহ্বা—যে অস্ত্র সম্পর্ক খুন করে", page: 34 },
      { title: "অধ্যায় ১০: চোখ ও কান—অন্তরের দুয়ার", page: 36 },
      { title: "অধ্যায় ১১: হিংসা (হাসাদ)", page: 38 },
      { title: "অধ্যায় ১২: রিয়া (লৌকিকতা)", page: 40 },
      { title: "অধ্যায় ১৩: রিজিকে বরকতহীনতা ও অশান্তি", page: 42 },
      { title: "অধ্যায় ১৪: ইবাদতে স্বাদ হারানো", page: 44 },
      { title: "অধ্যায় ১৫: ডিপ্রেশন, এনজাইটি ও চেহারা মলিন হওয়া", page: 46 },
      { title: "অধ্যায় ১৬: শয়তানের শেষ চাল—হতাশা", page: 48 },
      { title: "অধ্যায় ১৭: সলিড তওবা", page: 50 },
      { title: "অধ্যায় ১৮: নতুন করে শুরু—ক্লিন স্লেট", page: 52 },
      { title: "লেখক পরিচিতি", page: 54 },
    ],
    links: [],
  },
  {
    slug: "pretend",
    title: "প্রিটেন্ড",
    titleBn: "প্রিটেন্ড",
    tagline: "আত্মপ্রবঞ্চনার দেয়াল এবং ফিরে আসার গল্প",
    publisher: "Online edition (free) · 2nd revised edition",
    date: "February 2021 · revised January 2026",
    year: 2021,
    genre: "Novel",
    description:
      "A freely available novel about the hidden struggles of today's youth: Jisan's loneliness, the slow slavery of sin behind a mask of pretending, and the hard, hopeful road back. Written to be honest, thoughtful and accessible.",
    cover: "/books/pretend-cover.jpg",
    pdf: "/books/Pretend-Kazi-Abdul-Halim-Sani.pdf",
    pages: 56,
    badge: "Free",
    toc: [
      { title: "প্রচ্ছদ", page: 1 },
      { title: "উৎসর্গ", page: 3 },
      { title: "সূচিপত্র", page: 4 },
      { title: "ভূমিকা: এক মুসাফিরের জবানবন্দি", page: 5 },
      { title: "অধ্যায় ১: নিঃসঙ্গতা ও নীল বিষের শুরু", page: 8 },
      { title: "অধ্যায় ২: পাপের দাসত্ব ও বিবেকের মৃত্যু", page: 17 },
      { title: "অধ্যায় ৩: পরিবর্তনের ডাক ও জ্ঞান বনাম প্রবৃত্তি", page: 24 },
      { title: "অধ্যায় ৪: যুদ্ধক্ষেত্র এবং শুদ্ধির প্রথম ধাপ", page: 30 },
      { title: "অধ্যায় ৫: স্মৃতির দহন ও প্রশান্তির চাবিকাঠি", page: 38 },
      { title: "অধ্যায় ৬: সুমাইয়ার চিঠি ও ভাঙা দেয়ালের ওপারে", page: 44 },
      { title: "উপসংহার: আজ কেন নয়?", page: 50 },
      { title: "লেখক পরিচিতি", page: 55 },
    ],
    links: [],
  },
  {
    slug: "omanisha",
    title: "অমানিশা",
    titleEn: "Omanisha",
    tagline: "A mystery novel",
    publisher: "Pustok Prokason",
    date: "21 February 2021",
    year: 2021,
    genre: "Mystery novel",
    description:
      "My third published book: a mystery novel that takes readers on a thrilling journey full of suspense and intrigue, and a step into a new genre.",
    cover: "/books/omanisha-cover.jpg",
    links: [{ label: "Buy on Rokomari", href: "https://www.rokomari.com/book/208108/omanisha" }],
    badge: "Print",
  },
  {
    slug: "ek-tukro-swapno",
    title: "একটুকরো স্বপ্ন",
    titleEn: "Ek Tukro Swapno",
    tagline: "A storybook for teenagers",
    publisher: "Pandulipi Prokason",
    date: "12 February 2020",
    year: 2020,
    genre: "Teen fiction",
    description:
      "My second book: a storybook written for teenagers, published at the Amar Ekushey Boi Mela 2020, with a story that speaks to young readers.",
    cover: "/books/ektukro-cover.jpg",
    links: [{ label: "Buy on Rokomari", href: "https://www.rokomari.com/book/198763/ektokoro-swopno" }],
    badge: "Print",
  },
  {
    slug: "aj-keno-noy",
    title: "আজ কেন নয়?",
    titleEn: "Aj Keno Noy?",
    tagline: "Self-development for children",
    publisher: "Panjery Publications",
    date: "15 June 2018",
    year: 2018,
    genre: "Self-development",
    description:
      "My first book: a self-development guide written for children, motivating young readers in their studies and encouraging a positive, proactive mindset.",
    cover: "/books/ajkenonoy-cover.jpg",
    links: [
      {
        label: "See on Facebook",
        href: "https://web.facebook.com/permalink.php?story_fbid=pfbid0h19cPCwfw2eSuAghLTMgkQAJES6v3DPH7vpmBBkPePiWnhUMBuZ7d649q6FECoUSl&id=100064056638616",
      },
    ],
    badge: "Print",
  },
];

export const getBook = (slug: string) => books.find((b) => b.slug === slug);
