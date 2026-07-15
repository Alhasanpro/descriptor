"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type CustomSelectOption = {
  value: string;
  label: string;
  detail?: string;
  fontFamily?: string;
};

type CustomSelectProps = {
  ariaLabel: string;
  value: string;
  options: readonly CustomSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

type MenuPlacement = {
  left: number;
  width: number;
  maxHeight: number;
  opensUp: boolean;
};

const MENU_GAP = 5;
const MENU_EDGE_GAP = 8;
const MENU_MIN_WIDTH = 180;
const MENU_MAX_HEIGHT = 252;

export function CustomSelect({ ariaLabel, value, options, onChange, disabled = false }: CustomSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [placement, setPlacement] = useState<MenuPlacement>({ left: 0, width: MENU_MIN_WIDTH, maxHeight: MENU_MAX_HEIGHT, opensUp: false });
  const selected = options[selectedIndex];

  const updatePlacement = useCallback(() => {
    const root = rootRef.current;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!root || !trigger || !menu) return;

    const rootRect = root.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const canvas = root.closest<HTMLElement>(".inspector") ?? document.documentElement;
    const canvasRect = canvas === document.documentElement
      ? { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0, width: window.innerWidth }
      : canvas.getBoundingClientRect();
    const boundaryLeft = canvasRect.left + MENU_EDGE_GAP;
    const boundaryRight = canvasRect.right - MENU_EDGE_GAP;
    const boundaryTop = canvasRect.top + MENU_EDGE_GAP;
    const boundaryBottom = canvasRect.bottom - MENU_EDGE_GAP;
    const availableWidth = Math.max(0, boundaryRight - boundaryLeft);
    const width = Math.min(Math.max(rootRect.width, MENU_MIN_WIDTH), availableWidth);
    const desiredLeft = Math.min(Math.max(triggerRect.left, boundaryLeft), boundaryRight - width);
    const availableBelow = Math.max(0, boundaryBottom - triggerRect.bottom - MENU_GAP);
    const availableAbove = Math.max(0, triggerRect.top - boundaryTop - MENU_GAP);
    const neededHeight = Math.min(menu.scrollHeight, MENU_MAX_HEIGHT);
    const opensUp = availableBelow < neededHeight && availableAbove > availableBelow;
    const availableHeight = opensUp ? availableAbove : availableBelow;

    setPlacement({
      left: desiredLeft - rootRect.left,
      width,
      maxHeight: Math.max(0, Math.min(MENU_MAX_HEIGHT, availableHeight)),
      opensUp,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
  }, [open, options.length, updatePlacement]);

  useEffect(() => {
    if (!open) return;
    const update = () => window.requestAnimationFrame(updatePlacement);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = document.getElementById(`${listboxId}-option-${activeIndex}`);
    const menu = option?.closest<HTMLElement>(".custom-select-menu");
    if (option && menu) menu.scrollTop = Math.max(0, option.offsetTop - option.offsetHeight * 3 - 4);
  }, [activeIndex, listboxId, open]);

  function commit(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled || !options.length) return;
    if (event.key === "Escape") {
      if (open) event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(selectedIndex);
      } else {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((index) => (index + direction + options.length) % options.length);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) commit(activeIndex); else setOpen(true);
    }
  }

  return <div className={`custom-select${open ? " is-open" : ""}${placement.opensUp ? " opens-up" : ""}${disabled ? " is-disabled" : ""}`} ref={rootRef}>
    <button ref={triggerRef} type="button" role="combobox" className="custom-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined} disabled={disabled} onClick={() => { setActiveIndex(selectedIndex); setOpen((current) => !current); }} onKeyDown={onKeyDown}>
      <span className="custom-select-value" style={selected?.fontFamily ? { fontFamily: selected.fontFamily } : undefined}>{selected?.label ?? value}</span>
      <ChevronDown aria-hidden="true" />
    </button>
    {open ? <div ref={menuRef} id={listboxId} className="custom-select-menu" role="listbox" aria-label={ariaLabel} style={{ left: placement.left, width: placement.width, maxHeight: placement.maxHeight }}>
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isActive = index === activeIndex;
        return <button id={`${listboxId}-option-${index}`} key={option.value} type="button" role="option" aria-selected={isSelected} className={`custom-select-option${isSelected ? " is-selected" : ""}${isActive ? " is-active" : ""}`} onPointerMove={() => setActiveIndex(index)} onClick={() => commit(index)}>
          <span className="custom-select-option-copy"><b style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}>{option.label}</b>{option.detail ? <small>{option.detail}</small> : null}</span>
          <span className="custom-select-check" aria-hidden="true">{isSelected ? <Check /> : null}</span>
        </button>;
      })}
    </div> : null}
  </div>;
}
