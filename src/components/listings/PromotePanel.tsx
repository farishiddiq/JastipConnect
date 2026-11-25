import { Link } from 'react-router-dom';
import { Crown, Layers, Megaphone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/misc';
import { useCheckout } from '@/components/plans/Checkout';
import { useCurrentUser, usePlanState } from '@/hooks/useStore';
import { FREE_ACTIVE_TRIPS } from '@/lib/plans';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Provider's plan status with the upgrades that matter right now. */
export function PromotePanel({ activeFree = 0, className }: { compact?: boolean; activeFree?: number; className?: string }) {
  const user = useCurrentUser();
  const plan = usePlanState(user?.id);
  const { startCheckout } = useCheckout();
  const atLimit = !plan.pro && activeFree >= FREE_ACTIVE_TRIPS;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="bg-navy p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-300">Paket Anda</p>
        <p className="mt-1 text-lg font-bold">{plan.pro ? 'Jastiper Pro' : 'Gratis'}</p>
        <p className="mt-0.5 text-[13px] text-white/75">
          {plan.pro
            ? `Trip aktif tanpa batas, sampai ${formatDate(plan.pro.slice(0, 10))}.`
            : `${Math.min(activeFree, FREE_ACTIVE_TRIPS)}/${FREE_ACTIVE_TRIPS} trip aktif gratis terpakai · ${plan.credits} slot berbayar tersisa`}
        </p>
        {atLimit && plan.credits === 0 && <p className="mt-2 rounded-lg bg-amber-400/20 px-2.5 py-1.5 text-[13px] text-amber-100">Trip berikutnya butuh slot listing atau Pro.</p>}
      </div>
      <ul className="space-y-1 p-3">
        {!plan.pro && (
          <Row icon={<Crown />} title="Jastiper Pro" sub="Rp99.000/bulan · tanpa batas trip" onClick={() => startCheckout('pro')} />
        )}
        <Row icon={<Layers />} title="Slot listing" sub="Rp50.000/listing · atau 5 slot Rp200.000" onClick={() => startCheckout('nff_single')} />
        <Row icon={<Sparkles />} title="Boost trip" sub="Rp25.000 · teratas 7 hari" onClick={() => startCheckout('boost')} />
        <Row
          icon={<Megaphone />}
          title={plan.promoted ? `Promoted s/d ${formatDate(plan.promoted.slice(0, 10))}` : 'Promoted jastiper'}
          sub="Rp150.000/bulan · tampil di beranda"
          onClick={() => startCheckout('promoted')}
        />
      </ul>
      <div className="px-5 pb-5">
        <Button asChild variant="outline" className="w-full">
          <Link to="/harga">Bandingkan semua paket</Link>
        </Button>
      </div>
    </Card>
  );
}

function Row({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [&>span:first-child_svg]:h-4 [&>span:first-child_svg]:w-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">{icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-navy">{title}</span>
          <span className="block text-xs text-slate-500">{sub}</span>
        </span>
      </button>
    </li>
  );
}
