import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { About, Experience, Journey, Projects, Skills } from "@/components/Sections";
import { Lab } from "@/components/lab/Lab";
import { Arena } from "@/components/arena/Arena";
import { Books } from "@/components/Books";
import { Contact, Footer, Guestbook } from "@/components/Connect";
import { AchievementsModal, CommandPalette } from "@/components/CommandPalette";
import { ExplorerWatcher } from "@/components/ExplorerWatcher";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Arena />
        <Lab />
        <Books />
        <Journey />
        <Guestbook />
        <Contact />
      </main>
      <Footer />
      <ExplorerWatcher />
      <CommandPalette />
      <AchievementsModal />
    </>
  );
}
