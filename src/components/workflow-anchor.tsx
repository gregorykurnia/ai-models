"use client";

import { useEffect } from "react";

export default function WorkflowAnchor() {
  useEffect(() => {
    // A reload can retain the fragment while resetting the app's scroll container.
    const frame = requestAnimationFrame(() => {
      const { hash } = window.location;
      if (!hash.startsWith("#step-")) return;
      const step = document.getElementById(hash.slice(1));
      const main = step?.closest("main");
      if (main?.scrollTop === 0) step?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
