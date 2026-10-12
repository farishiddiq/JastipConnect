import * as React from 'react';
import { cn } from '@/lib/utils';

/** A suitcase that fills up as kilos are accepted, plus one slot per kilo (up to 30 kg). */
export function LuggageMeter({ total, reserved, className }: { total: number; reserved: number; className?: string }) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const ratio = total > 0 ? Math.min(1, reserved / total) : 0;
  const slots = total <= 30 ? Math.round(total) : 0;
  const used = Math.round(reserved);

  return (
    <div className={cn('flex items-center gap-5', className)}>
      <svg viewBox="0 0 120 104" className="h-24 w-28 shrink-0" role="img" aria-label={`Koper terisi ${Math.round(ratio * 100)} persen`}>
        <defs>
          <clipPath id="lug-body">
            <rect x="12" y="28" width="96" height="62" rx="12" />
          </clipPath>
        </defs>
        <path d="M44 28V18a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v10" fill="none" className="stroke-navy" strokeWidth="4" strokeLinecap="round" />
        <rect x="12" y="28" width="96" height="62" rx="12" className="fill-slate-100" />
        <g clipPath="url(#lug-body)">
          <rect
            x="12"
            y="28"
            width="96"
            height="62"
            className="fill-teal-500"
            style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: `scaleY(${on ? ratio : 0})`, transition: 'transform 1.2s cubic-bezier(0.32, 0.72, 0, 1)' }}
          />
          <rect x="34" y="28" width="5" height="62" className="fill-navy/15" />
          <rect x="81" y="28" width="5" height="62" className="fill-navy/15" />
        </g>
        <rect x="12" y="28" width="96" height="62" rx="12" fill="none" className="stroke-navy" strokeWidth="4" />
        <circle cx="34" cy="96" r="5" className="fill-navy" />
        <circle cx="86" cy="96" r="5" className="fill-navy" />
      </svg>
      <div className="min-w-0">
        <p className="num text-4xl font-bold text-navy">
          {Math.max(0, total - reserved)} kg <span className="text-lg font-medium text-slate-600">tersisa</span>
        </p>
        <p className="num mt-1 text-sm text-slate-600">
          dari {total} kg · {reserved} kg sudah masuk
        </p>
        {slots > 0 && (
          <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
            {Array.from({ length: slots }, (_, i) => (
              <span key={i} className={cn('h-3 w-3 rounded-[4px] transition-colors duration-500', i < used ? 'bg-navy' : 'bg-slate-200')} style={{ transitionDelay: `${i * 25}ms` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
