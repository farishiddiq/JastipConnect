import { cn } from '@/lib/utils';

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="18" className={light ? 'fill-white/10' : 'fill-navy'} />
        <path d="M18 36c0-8 6-14 14-14h14" strokeWidth="6" fill="none" strokeLinecap="round" className="stroke-teal-500" />
        <path d="M46 28c0 8-6 14-14 14H18" strokeWidth="6" fill="none" strokeLinecap="round" className="stroke-white" />
        <circle cx="46" cy="22" r="4" className="fill-teal-500" />
        <circle cx="18" cy="42" r="4" className="fill-white" />
      </svg>
      <span className={cn('text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-navy')}>
        Jastip<span className={light ? 'text-teal-300' : 'text-teal-600'}>Connect</span>
      </span>
    </span>
  );
}
