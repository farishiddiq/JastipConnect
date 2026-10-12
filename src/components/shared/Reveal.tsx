import * as React from 'react';
import { cn } from '@/lib/utils';

/** Fades and lifts its content in once it scrolls into view. Only transform and opacity animate, so it stays on the GPU. */
export function Reveal({
  as = 'div',
  i = 0,
  className,
  children,
}: {
  as?: 'div' | 'li' | 'section';
  i?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const [seen, setSeen] = React.useState(typeof IntersectionObserver === 'undefined');

  React.useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return React.createElement(as, { ref, className: cn('reveal', seen && 'is-in', className), style: { ['--i' as string]: i } }, children);
}
