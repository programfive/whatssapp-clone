"use client";

import { cn } from "@/lib/utils";

type Props = {
  items: Array<{ label: string; src?: string | null }>;
  size?: "sm" | "md";
  className?: string;
};

export function GroupAvatar({ items, size = "md", className }: Props) {
  const normalized = items
    .map((it) => ({ label: (it.label ?? "").trim() || "?", src: it.src ?? null }))
    .filter((it) => Boolean(it.label))
    .slice(0, 3);

  const cfg =
    size === "sm"
      ? {
        box: "h-10 w-10",
        bigText: "text-sm",
        chip: "h-6 w-6",
        chipText: "text-[9px]",
        ring: "ring-2 ring-whatsapp-charcoal",
      }
      : {
        box: "h-11 w-11",
        bigText: "text-sm",
        chip: "h-7 w-7",
        chipText: "text-[10px]",
        ring: "ring-2 ring-whatsapp-charcoal",
      };

  if (normalized.length <= 1) {
    const first = normalized[0];
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-whatsapp-carbon text-whatsapp-text-primary",
          cfg.box,
          className,
        )}
      >
        {first?.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.src} alt={first.label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span className={cn("font-semibold", cfg.bigText)}>{first?.label?.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>
    );
  }

  const a = normalized[0];
  const b = normalized[1];
  const c = normalized[2];

  return (
    <div className={cn("relative", cfg.box, className)}>
      <div
        className={cn(
          "absolute left-0 top-0 overflow-hidden rounded-full bg-whatsapp-carbon font-semibold text-whatsapp-text-primary",
          cfg.chip,
          cfg.chipText,
          cfg.ring,
        )}
      >
        {a.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.src} alt={a.label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span>{a.label.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div
        className={cn(
          "absolute right-0 top-0 overflow-hidden rounded-full bg-whatsapp-carbon font-semibold text-whatsapp-text-primary",
          cfg.chip,
          cfg.chipText,
          cfg.ring,
        )}
      >
        {b.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.src} alt={b.label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span>{b.label.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 overflow-hidden rounded-full bg-whatsapp-carbon font-semibold text-whatsapp-text-primary",
          cfg.chip,
          cfg.chipText,
          cfg.ring,
        )}
      >
        {c?.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.src} alt={c.label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span>{(c?.label ?? "?").slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
