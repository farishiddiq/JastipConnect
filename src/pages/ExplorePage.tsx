import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/display';
import { ListingGrid } from '@/components/listings/ListingCard';
import { useListingViews, usePageMeta } from '@/hooks/useStore';
import { COUNTRIES, getCountry } from '@/data/locations';
import { applyFilters, countActiveFilters, filtersToParams, parseFilters, type ExploreFilters, type SortKey } from '@/lib/search';
import { formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';

const SORT_LABELS: Record<SortKey, string> = {
  departure: 'Berangkat paling cepat',
  newest: 'Terbaru',
  price_asc: 'Harga terendah',
  price_desc: 'Harga tertinggi',
};

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const filters = React.useMemo(() => parseFilters(params), [params]);
  const views = useListingViews();
  const results = React.useMemo(() => applyFilters(views, filters), [views, filters]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [q, setQ] = React.useState(filters.q);

  const routeTitle =
    filters.oc || filters.dc
      ? `${filters.ocity || getCountry(filters.oc)?.name || 'Semua'} → ${filters.dcity || getCountry(filters.dc)?.name || 'Semua'}`
      : undefined;
  usePageMeta(
    filters.q ? `Cari “${filters.q}”` : routeTitle ? `Jastip ${routeTitle}` : 'Jelajahi listing',
    'Cari jastip diaspora dan personal shopper Saudi ↔ Indonesia berdasarkan rute, tanggal, dan harga.',
  );

  // Keep local search input in sync with back/forward navigation.
  React.useEffect(() => setQ(filters.q), [filters.q]);

  const update = React.useCallback(
    (patch: Partial<ExploreFilters>) => {
      const next = { ...filters, ...patch };
      setParams(filtersToParams(next), { replace: true });
    },
    [filters, setParams],
  );

  // Debounce free-text search into the URL.
  React.useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => update({ q }), 300);
    return () => clearTimeout(t);
  }, [q, filters.q, update]);

  const clearAll = () => {
    setQ('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const chips = buildChips(filters, update);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="container py-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Jelajahi listing</h1>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q });
          }}
          className="flex gap-2"
        >
          <label htmlFor="explore-q" className="sr-only">
            Cari listing
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              id="explore-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kota, produk, atau nama penyedia…"
              className="h-12 pl-11"
            />
          </div>
          <Button variant="outline" className="h-12 lg:hidden" onClick={() => setSheetOpen(true)} aria-label="Buka filter">
            <SlidersHorizontal />
            <span className="hidden sm:inline">Filter</span>
            {activeCount > 0 && <span className="rounded-full bg-teal-700 px-1.5 text-[11px] leading-5 text-white">{activeCount}</span>}
          </Button>
        </form>

        <TypeSegment value={filters.type} onChange={(type) => update({ type })} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block" aria-label="Filter">
          <div className="sticky top-24 rounded-[2rem] bg-slate-100 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy">Filter</h2>
              {(activeCount > 0 || filters.q) && (
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-teal-700 hover:underline">
                  Hapus semua
                </button>
              )}
            </div>
            <FilterFields filters={filters} update={update} idPrefix="d" />
          </div>
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0 rounded-[2rem] bg-slate-100 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p id="results-heading" className="text-sm text-slate-500" aria-live="polite">
              <span className="font-bold text-navy">{results.length}</span> listing ditemukan
              {!filters.includeClosed && <span className="max-sm:hidden"> · hanya yang masih buka</span>}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="hidden text-sm text-slate-500 sm:block">
                Urutkan
              </label>
              <Select id="sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value as SortKey })} className="h-10 w-auto text-sm">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {(chips.length > 0 || filters.q) && (
            <ul className="mb-5 flex flex-wrap gap-2" aria-label="Filter aktif">
              {filters.q && (
                <Chip
                  label={`“${filters.q}”`}
                  onRemove={() => {
                    setQ('');
                    update({ q: '' });
                  }}
                />
              )}
              {chips.map((c) => (
                <Chip key={c.label} label={c.label} onRemove={c.remove} />
              ))}
              <li>
                <button type="button" onClick={clearAll} className="flex h-9 items-center rounded-full px-3 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                  Hapus semua
                </button>
              </li>
            </ul>
          )}

          {filters.sort.startsWith('price') && !filters.cur && (
            <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-[13px] text-slate-600">
              Diurutkan per mata uang. Pilih mata uang di filter agar adil.
            </p>
          )}

          {results.length ? (
            <ListingGrid views={results} compact className="lg:!grid-cols-3 xl:!grid-cols-4" />
          ) : (
            <EmptyState
              icon={<SearchX />}
              title="Tidak ada listing yang cocok"
              description="Ubah kata kunci atau filter."
              action={
                <>
                  <Button onClick={clearAll}>Hapus semua filter</Button>
                  {!filters.includeClosed && (
                    <Button variant="outline" onClick={() => update({ includeClosed: true })}>
                      Tampilkan yang penuh/ditutup
                    </Button>
                  )}
                  <Button asChild variant="ghost">
                    <Link to="/explore">Lihat semua listing</Link>
                  </Button>
                </>
              }
            />
          )}
        </section>
      </div>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent variant="sheet">
          <DialogHeader>
            <DialogTitle>Filter</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <FilterFields filters={filters} update={update} idPrefix="m" />
          </DialogBody>
          <DialogFooter className="flex-row">
            <Button variant="outline" className="flex-1" onClick={clearAll}>
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setSheetOpen(false)}>
              Lihat {results.length} hasil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TypeSegment({ value, onChange }: { value: ExploreFilters['type']; onChange: (v: ExploreFilters['type']) => void }) {
  const items: [ExploreFilters['type'], string][] = [
    ['', 'Semua'],
    ['weight', 'Jastip Bagasi'],
    ['shopping', 'Jastip Belanja'],
  ];
  return (
    <div role="radiogroup" aria-label="Kategori" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {items.map(([v, label]) => (
        <button
          key={v || 'all'}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
            value === v ? 'border-navy bg-navy text-white' : 'border-border bg-white text-slate-600 hover:border-slate-300 hover:text-navy',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FilterFields({ filters: f, update, idPrefix }: { filters: ExploreFilters; update: (p: Partial<ExploreFilters>) => void; idPrefix: string }) {
  const id = (s: string) => `${idPrefix}-${s}`;
  const originCities = getCountry(f.oc)?.cities ?? COUNTRIES.flatMap((c) => c.cities);
  const destCities = getCountry(f.dc)?.cities ?? COUNTRIES.flatMap((c) => c.cities);
  const priceError =
    f.pmin && f.pmax && Number(f.pmin) > Number(f.pmax) ? 'Harga minimum lebih besar dari maksimum.' : undefined;
  const field = 'px-4';

  return (
    <div className="divide-y divide-slate-300/60 [&>*]:py-6 [&>:first-child]:pt-2 [&>:last-child]:pb-0">
      <div role="group" className="space-y-4">
        <p className="text-sm font-semibold text-navy">Arah</p>
        <div className="grid grid-cols-2 gap-2">
          <DirectionButton active={!f.oc && !f.dc} onClick={() => update({ oc: '', dc: '', ocity: '', dcity: '' })}>
            Semua
          </DirectionButton>
          <DirectionButton active={f.oc === 'SA' && f.dc === 'ID'} onClick={() => update({ oc: 'SA', dc: 'ID', ocity: '', dcity: '' })} label="Arab Saudi ke Indonesia">
            SA → ID
          </DirectionButton>
          <DirectionButton active={f.oc === 'ID' && f.dc === 'SA'} onClick={() => update({ oc: 'ID', dc: 'SA', ocity: '', dcity: '' })} label="Indonesia ke Arab Saudi">
            ID → SA
          </DirectionButton>
          <DirectionButton active={f.oc === 'AU' && f.dc === 'ID'} onClick={() => update({ oc: 'AU', dc: 'ID', ocity: '', dcity: '' })} label="Australia ke Indonesia">
            AU → ID
          </DirectionButton>
          <DirectionButton active={f.oc === 'ID' && f.dc === 'AU'} onClick={() => update({ oc: 'ID', dc: 'AU', ocity: '', dcity: '' })} label="Indonesia ke Australia">
            ID → AU
          </DirectionButton>
        </div>
        <Field id={id('ocity')} label="Kota asal">
          <Select className={field} value={f.ocity} onChange={(e) => update({ ocity: e.target.value })}>
            <option value="">Semua kota</option>
            {originCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={id('dcity')} label="Kota tujuan">
          <Select className={field} value={f.dcity} onChange={(e) => update({ dcity: e.target.value })}>
            <option value="">Semua kota</option>
            {destCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div role="group" className="space-y-4">
        <p className="text-sm font-semibold text-navy">Tanggal berangkat</p>
        <Field id={id('from')} label="Dari">
          <Input className={field} type="date" value={f.from} max={f.to || undefined} onChange={(e) => update({ from: e.target.value })} />
        </Field>
        <Field id={id('to')} label="Sampai">
          <Input className={field} type="date" value={f.to} min={f.from || undefined} onChange={(e) => update({ to: e.target.value })} />
        </Field>
      </div>

      <div role="group" className="space-y-4">
        <p className="text-sm font-semibold text-navy">Harga</p>
        <Field id={id('cur')} label="Mata uang" hint="Tanpa konversi kurs.">
          <Select className={field} value={f.cur} onChange={(e) => update({ cur: e.target.value as ExploreFilters['cur'], pmin: '', pmax: '' })}>
            <option value="">Semua</option>
            <option value="SAR">SAR (Riyal)</option>
            <option value="AUD">AUD (Dolar Australia)</option>
            <option value="IDR">IDR (Rupiah)</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={id('pmin')} label="Min">
            <Input
              className={field}
              type="number"
              inputMode="decimal"
              min={0}
              disabled={!f.cur}
              value={f.pmin}
              onChange={(e) => update({ pmin: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field id={id('pmax')} label="Maks" error={priceError}>
            <Input className={field} type="number" inputMode="decimal" min={0} disabled={!f.cur} value={f.pmax} onChange={(e) => update({ pmax: e.target.value })} placeholder="∞" />
          </Field>
        </div>
      </div>

      <Checkbox
        checked={f.includeClosed}
        onChange={(e) => update({ includeClosed: e.target.checked })}
        className="!rounded-none"
        label="Termasuk penuh atau ditutup"
      />
    </div>
  );
}

function DirectionButton({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        active ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-border bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <span className="flex h-9 items-center gap-1 rounded-full bg-teal-50 pl-3 pr-1 text-sm font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
        {label}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Hapus filter ${label}`}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    </li>
  );
}

function buildChips(f: ExploreFilters, update: (p: Partial<ExploreFilters>) => void) {
  const chips: { label: string; remove: () => void }[] = [];
  if (f.type) chips.push({ label: f.type === 'weight' ? 'Jastip Bagasi' : 'Jastip Belanja', remove: () => update({ type: '' }) });
  if (f.oc || f.ocity)
    chips.push({ label: `Dari: ${f.ocity || getCountry(f.oc)?.name}`, remove: () => update({ oc: '', ocity: '' }) });
  if (f.dc || f.dcity)
    chips.push({ label: `Ke: ${f.dcity || getCountry(f.dc)?.name}`, remove: () => update({ dc: '', dcity: '' }) });
  if (f.from || f.to)
    chips.push({
      label: `Berangkat ${f.from ? formatDateShort(f.from) : '…'} - ${f.to ? formatDateShort(f.to) : '…'}`,
      remove: () => update({ from: '', to: '' }),
    });
  if (f.cur)
    chips.push({
      label: `${f.cur}${f.pmin || f.pmax ? ` ${f.pmin || 0}-${f.pmax || '∞'}` : ''}`,
      remove: () => update({ cur: '', pmin: '', pmax: '' }),
    });
  if (f.includeClosed) chips.push({ label: 'Termasuk penuh/ditutup', remove: () => update({ includeClosed: false }) });
  return chips;
}

