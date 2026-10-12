import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl bg-white shadow-card', className)} {...props} />;
}

const badgeTones = {
  neutral: 'bg-slate-100 text-navy',
  muted: 'bg-slate-100 text-slate-600',
  navy: 'bg-slate-100 text-navy',
  blue: 'bg-slate-100 text-navy',
  teal: 'bg-slate-100 text-navy before:h-1.5 before:w-1.5 before:rounded-full before:content-[""] before:bg-teal-500',
  amber: 'bg-slate-100 text-navy before:h-1.5 before:w-1.5 before:rounded-full before:content-[""] before:bg-amber-500',
  red: 'bg-slate-100 text-navy before:h-1.5 before:w-1.5 before:rounded-full before:content-[""] before:bg-red-500',
  green: 'bg-slate-100 text-navy',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} aria-hidden />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-border', className)} />;
}

/** Accessible tab list (roving focus with arrow keys). Content is rendered by the caller. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
  label: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, idx: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(items[next]!.value);
    }
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1', className)}
    >
      {items.map((it, idx) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => (refs.current[idx] = el)}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKey(e, idx)}
            className={cn(
              'flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
              active ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy',
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  'min-w-[20px] rounded-full px-1.5 text-[11px] leading-5',
                  active ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600',
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
