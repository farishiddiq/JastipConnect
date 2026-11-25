import * as React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CreditCard, FlaskConical, Loader2, QrCode, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import type { PaymentMethod, PlanKind } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/misc';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useCurrentUser, useListingViews } from '@/hooks/useStore';
import { PAYMENT_METHODS, PLANS } from '@/lib/plans';
import { purchasePlan } from '@/services/purchaseService';
import { formatDate, formatMoney, listingTitle } from '@/lib/format';
import { cn } from '@/lib/utils';

const METHOD_ICON: Record<PaymentMethod, React.ElementType> = { qris: QrCode, va: Landmark, card: CreditCard };

type CheckoutCtx = { startCheckout: (kind: PlanKind, listingId?: string) => void };
const Ctx = React.createContext<CheckoutCtx>({ startCheckout: () => {} });
export const useCheckout = () => React.useContext(Ctx);

/** Simulated checkout. Nothing is charged; the plan is recorded and activated locally. */
export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{ kind: PlanKind; listingId?: string } | null>(null);
  const { requireProvider } = useAuth();
  const value = React.useMemo<CheckoutCtx>(
    () => ({
      startCheckout: (kind, listingId) => {
        const go = () => setState({ kind, listingId });
        if (requireProvider('Paket hanya untuk akun provider.', go)) go();
      },
    }),
    [requireProvider],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {state && <CheckoutDialog key={state.kind + (state.listingId ?? '')} kind={state.kind} initialListingId={state.listingId} onClose={() => setState(null)} />}
    </Ctx.Provider>
  );
}

function CheckoutDialog({ kind, initialListingId, onClose }: { kind: PlanKind; initialListingId?: string; onClose: () => void }) {
  const plan = PLANS[kind];
  const user = useCurrentUser();
  const views = useListingViews();
  const myOpen = views.filter((v) => v.listing.ownerId === user?.id && v.status === 'open');
  const [listingId, setListingId] = React.useState(initialListingId ?? myOpen[0]?.listing.id ?? '');
  const [method, setMethod] = React.useState<PaymentMethod>('qris');
  const [step, setStep] = React.useState<'review' | 'paying' | 'done'>('review');
  const [expires, setExpires] = React.useState<string>();
  const timer = React.useRef<number>();
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!user) return null;

  const pay = () => {
    setStep('paying');
    timer.current = window.setTimeout(() => {
      const r = purchasePlan(user.id, kind, method, plan.needsListing ? listingId : undefined);
      if (!r.ok) {
        setStep('review');
        return toast.error(r.error);
      }
      setExpires(r.data.expiresAt);
      setStep('done');
    }, 1100);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && step !== 'paying' && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <Badge tone="amber" className="mb-2 w-fit">
            <FlaskConical /> Pembayaran simulasi
          </Badge>
          <DialogTitle>{step === 'done' ? `${plan.name} aktif` : `Checkout ${plan.name}`}</DialogTitle>
          <DialogDescription>{step === 'done' ? 'Tidak ada uang yang ditagih. Ini hanya simulasi untuk demo.' : plan.summary}</DialogDescription>
        </DialogHeader>

        {step === 'done' ? (
          <DialogBody className="space-y-3 pb-2">
            <div className="flex flex-col items-center rounded-2xl bg-emerald-50 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <p className="mt-2 font-bold text-navy">Berhasil</p>
              <p className="text-sm text-slate-600">{expires ? `Aktif sampai ${formatDate(expires.slice(0, 10))}.` : plan.credits ? `${plan.credits} slot listing ditambahkan.` : ''}</p>
            </div>
          </DialogBody>
        ) : (
          <DialogBody className="space-y-4">
            {plan.needsListing && (
              <Field id="co-listing" label="Trip yang di-boost" required hint={myOpen.length ? undefined : 'Belum ada trip yang sedang buka.'}>
                <Select value={listingId} onChange={(e) => setListingId(e.target.value)} disabled={!myOpen.length}>
                  {myOpen.map((v) => (
                    <option key={v.listing.id} value={v.listing.id}>
                      {listingTitle(v.listing)} ({v.listing.origin.city} → {v.listing.destination.city}){v.featuredUntil ? ' · sedang unggulan' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-navy">Metode pembayaran</legend>
              <div className="grid gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = METHOD_ICON[m.value];
                  return (
                    <label
                      key={m.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                        method === m.value ? 'border-teal-500 bg-teal-50/60' : 'border-border hover:bg-slate-50',
                      )}
                    >
                      <input type="radio" name="method" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="accent-teal-600" />
                      <Icon className="h-5 w-5 text-navy" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy">{m.label}</span>
                        <span className="block text-xs text-slate-500">{m.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">
                Total <span className="text-xs">({plan.unit})</span>
              </span>
              <span className="num text-lg font-extrabold text-navy">{formatMoney(plan.priceIdr, 'IDR')}</span>
            </div>
            <p className="text-xs text-slate-500">
              Dengan membayar, Anda menyetujui <Link to="/syarat#berbayar" className="font-semibold text-teal-700 underline">ketentuan layanan berbayar</Link>. Mode demo: tidak ada tagihan.
            </p>
          </DialogBody>
        )}

        <DialogFooter>
          {step === 'done' ? (
            <Button variant="accent" onClick={onClose}>
              Selesai
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={step === 'paying'}>
                Batal
              </Button>
              <Button variant="accent" onClick={pay} disabled={step === 'paying' || (plan.needsListing && !listingId)}>
                {step === 'paying' ? <Loader2 className="animate-spin" /> : null}
                {step === 'paying' ? 'Memproses…' : `Bayar ${formatMoney(plan.priceIdr, 'IDR')}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
