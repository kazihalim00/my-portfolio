"use client";

import { useEffect } from "react";
import { useApp } from "./Providers";

/** Unlocks the "Explorer" achievement once the visitor reaches the contact section. */
export function ExplorerWatcher() {
  const { unlock } = useApp();
  useEffect(() => {
    const el = document.getElementById("contact");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        unlock("explorer");
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [unlock]);
  return null;
}
