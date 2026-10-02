"use client";

import { useEffect } from "react";

function spanCount(row: HTMLTableRowElement) {
  return Array.from(row.cells).reduce((count, cell) => count + cell.colSpan, 0);
}

function readColumnWidths(table: HTMLTableElement) {
  const tableWidth = table.getBoundingClientRect().width;
  const existingColumns = Array.from(table.querySelectorAll("colgroup col"));
  let widths = existingColumns.map(column => {
    const rectWidth = column.getBoundingClientRect().width;
    return rectWidth || Number.parseFloat(getComputedStyle(column).width) || 0;
  });

  if (!widths.length || widths.some(width => width <= 0)) {
    const columnCount = Math.max(0, ...Array.from(table.rows, spanCount));
    const completeRow = [...Array.from(table.tBodies).flatMap(body => Array.from(body.rows)), ...Array.from(table.tHead?.rows ?? [])]
      .find(row => row.cells.length === columnCount && Array.from(row.cells).every(cell => cell.colSpan === 1));
    widths = completeRow ? Array.from(completeRow.cells, cell => cell.getBoundingClientRect().width) : [];
  }

  const total = widths.reduce((sum, width) => sum + width, 0);
  if (!total || !tableWidth) return widths;
  const scale = tableWidth / total;
  return widths.map(width => width * scale);
}

export function StickyTableHeaders({ regionId }: { regionId: string }) {
  useEffect(() => {
    const region = document.getElementById(regionId);
    const table = region?.querySelector<HTMLTableElement>(":scope > table");
    const sourceHead = table?.tHead;
    if (!region || !table || !sourceHead) return;

    const overlay = document.createElement("div");
    overlay.className = "table-sticky-header-copy";
    if (table.closest(".master")) overlay.classList.add("master");
    overlay.setAttribute("aria-hidden", "true");

    let mirroredTable: HTMLTableElement | null = null;
    let animationFrame = 0;

    const rebuild = () => {
      const latestHead = table.tHead;
      if (!latestHead) return;

      const copy = table.cloneNode(false) as HTMLTableElement;
      copy.removeAttribute("id");
      copy.style.position = "absolute";
      copy.style.top = "0";
      copy.style.margin = "0";
      copy.style.tableLayout = "fixed";

      const caption = table.caption?.cloneNode(true);
      if (caption) copy.append(caption);

      const measuredWidths = readColumnWidths(table);
      if (measuredWidths.length) {
        const columns = document.createElement("colgroup");
        for (const width of measuredWidths) {
          const column = document.createElement("col");
          column.style.width = `${width}px`;
          columns.append(column);
        }
        copy.append(columns);
      } else {
        for (const group of table.querySelectorAll(":scope > colgroup")) copy.append(group.cloneNode(true));
      }

      copy.append(latestHead.cloneNode(true));
      for (const control of copy.querySelectorAll<HTMLElement>("a, button, input, select, textarea, [tabindex]")) {
        control.tabIndex = -1;
      }

      overlay.replaceChildren(copy);
      mirroredTable = copy;
      queueSync();
    };

    const sync = () => {
      animationFrame = 0;
      if (!mirroredTable) return;

      const regionRect = region.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const headRect = table.tHead?.getBoundingClientRect();
      if (!headRect) return;

      const stickyTop = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--table-sticky-top")) || 0;
      const borderLeft = Number.parseFloat(getComputedStyle(region).borderLeftWidth) || 0;
      const contentLeft = regionRect.left + borderLeft;
      const active = headRect.top <= stickyTop && tableRect.bottom > stickyTop + headRect.height;

      overlay.style.display = active ? "block" : "none";
      if (!active) return;

      overlay.style.top = `${stickyTop}px`;
      overlay.style.left = `${contentLeft}px`;
      overlay.style.width = `${region.clientWidth}px`;
      overlay.style.height = `${headRect.height}px`;
      mirroredTable.style.left = `${tableRect.left - contentLeft}px`;
      mirroredTable.style.width = `${tableRect.width}px`;
      mirroredTable.style.minWidth = `${tableRect.width}px`;
      mirroredTable.style.top = `${tableRect.top - headRect.top}px`;

      const sourceCells = Array.from(table.tHead?.querySelectorAll("th") ?? []);
      const copiedCells = Array.from(mirroredTable.tHead?.querySelectorAll("th") ?? []);
      copiedCells.forEach((cell, index) => {
        const source = sourceCells[index];
        if (source) cell.style.width = `${source.getBoundingClientRect().width}px`;
      });
    };

    function queueSync() {
      if (!animationFrame) animationFrame = requestAnimationFrame(sync);
    }

    const forwardClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !mirroredTable) return;

      const button = target.closest("button");
      if (button) {
        event.preventDefault();
        const buttons = Array.from(mirroredTable.querySelectorAll("button"));
        const sourceButtons = Array.from(table.tHead?.querySelectorAll("button") ?? []);
        sourceButtons[buttons.indexOf(button)]?.click();
        return;
      }

      const link = target.closest("a");
      if (link) {
        event.preventDefault();
        const links = Array.from(mirroredTable.querySelectorAll("a"));
        const sourceLinks = Array.from(table.tHead?.querySelectorAll("a") ?? []);
        sourceLinks[links.indexOf(link)]?.click();
      }
    };

    rebuild();
    document.body.append(overlay);
    overlay.addEventListener("click", forwardClick);

    const scrollRoot = region.closest<HTMLElement>(".app-main");
    scrollRoot?.addEventListener("scroll", queueSync, { passive: true });
    region.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("resize", queueSync);

    const resizeObserver = new ResizeObserver(rebuild);
    resizeObserver.observe(region);
    resizeObserver.observe(table);
    resizeObserver.observe(sourceHead);

    const headerObserver = new MutationObserver(rebuild);
    headerObserver.observe(sourceHead, { subtree: true, childList: true, characterData: true, attributes: true });
    const tableObserver = new MutationObserver(rebuild);
    tableObserver.observe(table, { childList: true });

    return () => {
      cancelAnimationFrame(animationFrame);
      overlay.removeEventListener("click", forwardClick);
      overlay.remove();
      scrollRoot?.removeEventListener("scroll", queueSync);
      region.removeEventListener("scroll", queueSync);
      window.removeEventListener("scroll", queueSync);
      window.removeEventListener("resize", queueSync);
      resizeObserver.disconnect();
      headerObserver.disconnect();
      tableObserver.disconnect();
    };
  }, [regionId]);

  return null;
}
