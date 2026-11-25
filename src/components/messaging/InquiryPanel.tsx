import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { Inquiry, Listing, User } from '@/types';
import { Button } from '@/components/ui/button';
import { InquiryStatusBadge } from '@/components/shared/display';
import { HoldCountdown, OrderActions, OrderItems, OrderTimeline } from '@/components/orders/OrderParts';
import { inquiryTotals } from '@/lib/availability';
import { formatKg, formatMoneyGroups } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Order summary pinned above the chat, with the next action for whoever is viewing. */
export function InquiryPanel({ inquiry, listing, me, other }: { inquiry: Inquiry; listing?: Listing; me: User; other?: User }) {
  const [expanded, setExpanded] = React.useState(true);
  const isProvider = inquiry.providerId === me.id;
  const totals = inquiryTotals(inquiry, listing);

  return (
    <section className="border-b border-border bg-slate-50/80" aria-label="Ringkasan order">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
      >
        <InquiryStatusBadge status={inquiry.status} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
          {listing?.type === 'weight' ? `Titip ${formatKg(inquiry.handover?.weightKg ?? inquiry.requestedKg ?? 0)}` : `${(inquiry.items ?? []).reduce((s, l) => s + l.quantity, 0)} item`}
          <span className="font-normal text-slate-500"> · {formatMoneyGroups(totals)}</span>
        </span>
        <HoldCountdown inquiry={inquiry} className="hidden sm:inline-flex" />
        <span className="hidden text-xs text-slate-400 md:inline">{isProvider ? 'Anda penyedia' : 'Anda klien'}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          <OrderTimeline inquiry={inquiry} compact />
          <div className="rounded-xl bg-white p-3 ring-1 ring-border">
            {listing ? (
              <Link to={`/listings/${listing.id}`} className="text-sm font-semibold text-teal-700 hover:underline">
                {listing.title}
              </Link>
            ) : (
              <span className="text-sm text-slate-500">Listing sudah dihapus</span>
            )}
            <div className="mt-1">
              <OrderItems inquiry={inquiry} listing={listing} />
            </div>
            {inquiry.closedReason && <p className="mt-1 text-xs text-slate-500">{inquiry.closedReason}</p>}
          </div>
          <OrderActions inquiry={inquiry} listing={listing} me={me} other={other} layout="inline" />
          <Button asChild variant="link" size="sm" className="h-auto">
            <Link to={`/orders/${inquiry.id}`}>
              <ExternalLink /> Buka halaman order
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
