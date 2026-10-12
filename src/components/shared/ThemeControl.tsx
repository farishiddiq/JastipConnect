import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '@/types';
import { useDB } from '@/hooks/useStore';
import { setTheme } from '@/services/userService';
import { cn } from '@/lib/utils';

export const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Otomatis', icon: Monitor },
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
];

export function useThemePreference(): ThemePreference {
  return useDB().settings.theme ?? 'system';
}

/** Three-way appearance control: follows the system by default. */
export function ThemeControl({ className }: { className?: string }) {
  const current = useThemePreference();
  return (
    <div role="radiogroup" aria-label="Tampilan" className={cn('inline-flex gap-1 rounded-xl bg-slate-100 p-1', className)}>
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
            current === value ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
