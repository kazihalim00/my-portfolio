"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bug, FlaskConical, SquareTerminal } from "lucide-react";
import { Section, Reveal } from "../ui";
import { LabProvider } from "./LabState";
import { BugHunt } from "./BugHunt";
import { TestRunner } from "./TestRunner";
import { Terminal } from "./Terminal";

export type LabTab = "hunt" | "tests" | "terminal";
const TABS: { id: LabTab; label: string; icon: typeof Bug }[] = [
  { id: "hunt", label: "Bug Hunt", icon: Bug },
  { id: "tests", label: "Test Runner", icon: FlaskConical },
  { id: "terminal", label: "Terminal", icon: SquareTerminal },
];

/** Anywhere on the page: openLab("terminal") scrolls to the lab and switches tab. */
export function openLab(tab: LabTab) {
  window.dispatchEvent(new CustomEvent<LabTab>("lab:tab", { detail: tab }));
  document.getElementById("lab")?.scrollIntoView({ behavior: "smooth" });
}

export function Lab() {
  const [tab, setTab] = useState<LabTab>("hunt");

  useEffect(() => {
    const h = (e: Event) => setTab((e as CustomEvent<LabTab>).detail);
    window.addEventListener("lab:tab", h);
    return () => window.removeEventListener("lab:tab", h);
  }, []);

  return (
    <Section
      id="lab"
      eyebrow="05 · QA Lab"
      title={
        <>
          Don&apos;t just read my CV. <span className="gradient-text">Test me.</span>
        </>
      }
      intro="Three hands-on experiments. Hunt the bugs I planted, watch them fail in a Playwright-style test run, or explore everything from a terminal."
    >
      <LabProvider>
        <Reveal>
          <div className="card overflow-hidden">
            <div className="flex gap-1 overflow-x-auto border-b border-line/10 p-2" role="tablist" aria-label="QA Lab">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    tab === t.id ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {tab === t.id && <motion.span layoutId="lab-tab" className="absolute inset-0 -z-10 rounded-xl bg-fg/[0.06] ring-1 ring-fg/10" />}
                  <t.icon size={16} className={tab === t.id ? "text-brand" : ""} />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4 sm:p-6">
              {/* Keep all panels mounted so game state survives tab switches. */}
              <div role="tabpanel" id="panel-hunt" aria-labelledby="tab-hunt" hidden={tab !== "hunt"}>
                <BugHunt />
              </div>
              <div role="tabpanel" id="panel-tests" aria-labelledby="tab-tests" hidden={tab !== "tests"}>
                <TestRunner />
              </div>
              <div role="tabpanel" id="panel-terminal" aria-labelledby="tab-terminal" hidden={tab !== "terminal"}>
                <Terminal onGoLab={(t) => setTab(t)} />
              </div>
            </div>
          </div>
        </Reveal>
      </LabProvider>
    </Section>
  );
}
