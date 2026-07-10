import { useEffect, useRef, useState } from "react";
import type { Placeholder } from "@/lib/cert-types";
import { cn } from "@/lib/utils";

interface Props {
  dataUrl: string;
  placeholders: Placeholder[];
  selectedId: string | null;
  previewValues?: Record<string, string>;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Placeholder>) => void;
  onAddAt: (xRel: number, yRel: number) => void;
}

type DragMode = { id: string; type: "move" | "resize"; startX: number; startY: number; orig: Placeholder } | null;

export function PlaceholderCanvas({
  dataUrl,
  placeholders,
  selectedId,
  previewValues,
  onSelect,
  onChange,
  onAddAt,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode>(null);
  const [dispH, setDispH] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDispH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function rect() {
    return wrapRef.current!.getBoundingClientRect();
  }

  function onPointerDownBox(e: React.PointerEvent, p: Placeholder, type: "move" | "resize") {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect(p.id);
    setDrag({ id: p.id, type, startX: e.clientX, startY: e.clientY, orig: p });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const r = rect();
    const dx = (e.clientX - drag.startX) / r.width;
    const dy = (e.clientY - drag.startY) / r.height;
    if (drag.type === "move") {
      onChange(drag.id, {
        xRel: Math.min(0.999, Math.max(0, drag.orig.xRel + dx)),
        yRel: Math.min(0.999, Math.max(0, drag.orig.yRel + dy)),
      });
    } else {
      onChange(drag.id, { wRel: Math.min(1, Math.max(0.05, drag.orig.wRel + dx)) });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (drag) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch { /* noop */ }
    }
    setDrag(null);
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (drag) return;
    const r = rect();
    const xRel = (e.clientX - r.left) / r.width;
    const yRel = (e.clientY - r.top) / r.height;
    onAddAt(Math.max(0, Math.min(0.95, xRel - 0.15)), Math.max(0, Math.min(0.95, yRel - 0.03)));
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onCanvasClick}
    >
      <img src={dataUrl} alt="Certificate template" className="pointer-events-none block w-full" draggable={false} />
      {placeholders.map((p) => {
        const value = previewValues?.[p.id] ?? p.sample ?? p.label;
        const selected = p.id === selectedId;
        const justify = p.align === "center" ? "center" : p.align === "right" ? "flex-end" : "flex-start";
        return (
          <div
            key={p.id}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => onPointerDownBox(e, p, "move")}
            className={cn(
              "absolute flex cursor-move items-center rounded-sm px-1",
              selected ? "ring-2 ring-primary" : "ring-1 ring-primary/30 hover:ring-primary/60",
            )}
            style={{
              left: `${p.xRel * 100}%`,
              top: `${p.yRel * 100}%`,
              width: `${p.wRel * 100}%`,
              height: `${Math.max(p.fontRel * 100, 3)}%`,
              justifyContent: justify,
              backgroundColor: selected ? "rgba(99,102,241,0.08)" : "transparent",
            }}
          >
            <span
              className="overflow-hidden whitespace-nowrap"
              style={{
                color: p.color,
                fontFamily: p.fontFamily,
                fontSize: `${Math.max(p.fontRel * dispH, 6)}px`,
                fontWeight: p.bold ? 700 : 400,
                fontStyle: p.italic ? "italic" : "normal",
                lineHeight: 1,
              }}
            >
              {value}
            </span>
            {selected && (
              <span
                onPointerDown={(e) => onPointerDownBox(e, p, "resize")}
                className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-background bg-primary"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}