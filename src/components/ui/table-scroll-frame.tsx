"use client";

import { useEffect, useState, type ReactNode } from "react";

export function TableScrollFrame({ regionId, children }: { regionId: string; children: ReactNode }) {
  const [earlierColumns, setEarlierColumns] = useState(false);
  const [moreColumns, setMoreColumns] = useState(false);
  useEffect(() => {
    const region = document.getElementById(regionId);
    if (!region) return;
    const update = () => {
      setEarlierColumns(region.scrollLeft > 1);
      setMoreColumns(region.scrollWidth - region.clientWidth - region.scrollLeft > 1);
    };
    const observer = new ResizeObserver(update);
    observer.observe(region);
    if (region.firstElementChild) observer.observe(region.firstElementChild);
    region.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); region.removeEventListener("scroll", update); };
  }, [regionId]);
  return <div className="table-scroll-frame">
    <div className="table-overflow-cue-slot" aria-hidden="true">
      {earlierColumns && <span className="table-overflow-cue table-overflow-cue--earlier">← Earlier columns</span>}
      {moreColumns && <span className="table-overflow-cue table-overflow-cue--more">More columns →</span>}
    </div>
    {children}
  </div>;
}
