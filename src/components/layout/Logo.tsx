import { cn } from '@/lib/utils';

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? '#fff' : '#12233F'} />
        <path d="M18 36c0-8 6-14 14-14h14" stroke="#16B8A6" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M46 28c0 8-6 14-14 14H18" stroke={light ? '#12233F' : '#fff'} strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="46" cy="22" r="4" fill="#16B8A6" />
        <circle cx="18" cy="42" r="4" fill={light ? '#12233F' : '#fff'} />
      </svg>
      <span className={cn('text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-navy')}>
        Jastip<span className="text-teal-500">Connect</span>
      </span>
    </span>
  );
}
