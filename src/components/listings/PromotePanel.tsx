import { Megaphone, Radio, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/misc';
import { ComingSoonBadge } from '@/components/shared/display';
import { cn } from '@/lib/utils';

/** Visual preview only. Nothing here is purchasable and no payment is simulated. */
export function PromotePanel({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Card className={cn('overflow-hidden border-amber-200', className)}>
      <div className="flex items-start gap-3 bg-gradient-to-br from-amber-50 to-white p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-white">
          <Megaphone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-navy">Promosikan Listing</h2>
            <ComingSoonBadge />
          </div>
          <p className="mt-1 text-[13px] text-slate-600">Jangkau lebih banyak penitip.</p>
        </div>
      </div>
      <ul className={cn('grid gap-3 p-5 pt-3', !compact && 'sm:grid-cols-2')}>
        <li className="rounded-xl border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Sparkles className="h-4 w-4 text-amber-500" /> Featured Listing
          </p>
          <p className="mt-1 text-xs text-slate-500">Tampil di urutan atas.</p>
        </li>
        <li className="rounded-xl border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Radio className="h-4 w-4 text-amber-500" /> Broadcast
          </p>
          <p className="mt-1 text-xs text-slate-500">Kirim info ke peminat rute.</p>
        </li>
      </ul>
      <div className="px-5 pb-5">
        <Button variant="outline" className="w-full" disabled aria-disabled>
          Segera hadir
        </Button>
      </div>
    </Card>
  );
}
