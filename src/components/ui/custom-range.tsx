"use client";

import { useRef } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { clampRangeValue, rangeValueFromPointer } from "@/lib/editor/range";

type CustomRangeProps = {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  size?: "regular" | "compact";
  onChange: (value: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

export function CustomRange({ ariaLabel, value, min, max, step = 1, disabled = false, className = "", size = "regular", onChange, onInteractionStart, onInteractionEnd }: CustomRangeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef(false);
  const progress = max === min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const style = { "--range-progress": `${progress}%` } as CSSProperties;

  const updateFromPointer = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    onChange(rangeValueFromPointer({ clientX: event.clientX, left: bounds.left, width: bounds.width, inset: size === "compact" ? 7 : 9, min, max, step }));
  };

  const beginPointerInteraction = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    draggingRef.current = true;
    inputRef.current?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    onInteractionStart?.();
    updateFromPointer(event);
  };

  const endPointerInteraction = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onInteractionEnd?.();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const keySteps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
    if (!(event.key in keySteps) && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    onInteractionStart?.();
    const next = event.key === "Home" ? min : event.key === "End" ? max : value + keySteps[event.key] * step;
    onChange(clampRangeValue(next, min, max, step));
  };

  return <span className={`custom-range${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`} data-ui="native-slider" data-size={size} style={style} onPointerDown={beginPointerInteraction} onPointerMove={(event)=>{if(draggingRef.current)updateFromPointer(event);}} onPointerUp={endPointerInteraction} onPointerCancel={endPointerInteraction}>
    <span className="custom-range-visual" aria-hidden="true">
      <span className="custom-range-track" />
      <span className="custom-range-fill" />
      <span className="custom-range-thumb" />
    </span>
    <input ref={inputRef} className="custom-range-input" aria-label={ariaLabel} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onKeyDown={handleKeyDown} onKeyUp={onInteractionEnd} onBlur={onInteractionEnd} onInput={(event) => onChange(Number(event.currentTarget.value))} />
  </span>;
}
