"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import { cx } from "@managevent/ui/brand";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  /** Accessible name of the tab list, e.g. "Reply details". */
  label: string;
  items: readonly TabItem[];
  /** The tab selected first. Defaults to the first item. */
  defaultId?: string | undefined;
  /** Called when the selection changes (for example to mirror it in the URL). */
  onChange?: ((id: string) => void) | undefined;
  className?: string | undefined;
}

/**
 * In-page tabs (`.tabs` / `.tab`) following the WAI-ARIA tabs pattern: arrow keys, Home and End
 * move between tabs, Tab moves into the panel. For navigation between PAGES use links with
 * `aria-current="page"` instead (see `StudioTabs`).
 */
export function Tabs({ label, items, defaultId, onChange, className }: TabsProps) {
  const baseId = useId();
  const [selected, setSelected] = useState(defaultId ?? items[0]?.id ?? "");
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const active = items.find((item) => item.id === selected) ?? items[0];

  const select = (id: string, focus: boolean) => {
    setSelected(id);
    onChange?.(id);
    if (focus) tabRefs.current.get(id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === active?.id);
    if (index === -1) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    let next: number;
    if (event.key === forward) next = (index + 1) % items.length;
    else if (event.key === backward) next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    const target = items[next];
    if (target) select(target.id, true);
  };

  if (!active) return null;

  return (
    <div className={className}>
      <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {items.map((item) => {
          const isActive = item.id === active.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              className={cx("tab")}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(item.id, false)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className="tab-panel"
        tabIndex={0}
      >
        {active.content}
      </div>
    </div>
  );
}
