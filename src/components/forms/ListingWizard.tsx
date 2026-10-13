import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, Plus, Rocket, Save, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Currency, Listing } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form';
import { Badge, Card } from '@/components/ui/misc';
import { ListingCover, ProductThumb, RouteDisplay, TypeBadge } from '@/components/shared/display';
import { SafetyNotice } from '@/components/shared/SafetyNotice';
import { MediaPicker } from '@/components/forms/MediaPicker';
import { useConfirm } from '@/components/shared/ConfirmProvider';
import { COUNTRIES, getCountry, HANDOVER_METHODS, PRODUCT_CATEGORIES } from '@/data/locations';
import {
  emptyProduct,
  errorsForStep,
  payloadFromForm,
  STEP_FIELDS,
  suggestTitle,
  validateListingForm,
  type FormErrors,
  type ListingForm,
  type ProductForm,
  type ValidationContext,
} from '@/lib/listingForm';
import { formatDate, formatKg, formatMoney, formatProductPrice } from '@/lib/format';
import { createListing, updateListing } from '@/services/listingService';
import { todayKey } from '@/lib/dates';
import { cn, uuid } from '@/lib/utils';

const STEP_LABELS = {
  weight: ['Rute & Jadwal', 'Kapasitas & Harga', 'Detail & Aturan', 'Pratinjau'],
  shopping: ['Perjalanan', 'Produk', 'Ketentuan', 'Pratinjau'],
};

type Props = {
  mode: 'create' | 'edit';
  initial: ListingForm;
  userId: string;
  listing?: Listing;
  ctx?: ValidationContext;
  onBackToType?: () => void;
};

export function ListingWizard({ mode, initial, userId, listing, ctx, onBackToType }: Props) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [form, setForm] = React.useState<ListingForm>(initial);
  const [step, setStep] = React.useState(0);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [dirty, setDirty] = React.useState(false);
  const topRef = React.useRef<HTMLDivElement>(null);
  const labels = STEP_LABELS[form.type];
  const isDraft = mode === 'create' || listing?.status === 'draft';
  const lastStep = labels.length - 1;

  // Warn on browser close/refresh with unsaved changes.
  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = <K extends keyof ListingForm>(key: K, value: ListingForm[K]) => {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const k = String(key);
      const affectsRoute = /City|Country/.test(k);
      const stale = Object.keys(e).filter((x) => x === k || x.startsWith(`${k}.`) || (affectsRoute && x === 'route'));
      if (!stale.length) return e;
      const next = { ...e };
      stale.forEach((x) => delete next[x]);
      return next;
    });
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const focusFirstError = (errs: FormErrors) => {
    requestAnimationFrame(() => {
      const first = Object.keys(errs)[0];
      if (!first) return;
      const id = first.startsWith('products.') ? `p-${first.split('.')[1]}-${first.split('.')[2]}` : `f-${first}`;
      const el = document.getElementById(id) ?? document.querySelector<HTMLElement>('[aria-invalid="true"]');
      el?.focus();
    });
  };

  const goNext = () => {
    const stepErrs = errorsForStep(validateListingForm(form, ctx), form.type, step);
    if (step < lastStep && Object.keys(stepErrs).length) {
      setErrors(stepErrs);
      toast.error('Periksa kembali isian yang ditandai.');
      focusFirstError(stepErrs);
      return;
    }
    if (step === lastStep - 1 && !form.title.trim()) set('title', suggestTitle(form));
    setErrors({});
    setStep((s) => Math.min(lastStep, s + 1));
    scrollTop();
  };

  const goBack = () => {
    if (step === 0 && onBackToType) return onBackToType();
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    scrollTop();
  };

  const publish = () => {
    const all = validateListingForm(form, ctx);
    if (Object.keys(all).length) {
      setErrors(all);
      const badStep = STEP_FIELDS[form.type].findIndex((_, i) => Object.keys(errorsForStep(all, form.type, i)).length > 0);
      if (badStep >= 0 && badStep !== step) {
        setStep(badStep);
        toast.error(`Masih ada isian yang perlu diperbaiki di langkah “${labels[badStep]}”.`);
      } else {
        toast.error('Periksa kembali isian yang ditandai.');
      }
      focusFirstError(errorsForStep(all, form.type, badStep >= 0 ? badStep : step));
      return;
    }
    const payload = payloadFromForm(form);
    const res =
      mode === 'create' ? createListing(userId, payload, true) : updateListing(listing!.id, userId, payload, true);
    if (!res.ok) return toast.error(res.error);
    setDirty(false);
    toast.success(mode === 'create' || listing?.status === 'draft' ? 'Listing diterbitkan' : 'Perubahan disimpan');
    navigate(`/listings/${res.data.id}`);
  };

  const saveDraft = () => {
    const payload = payloadFromForm({ ...form, acknowledgedRules: form.acknowledgedRules });
    const res = mode === 'create' ? createListing(userId, payload, false) : updateListing(listing!.id, userId, payload, false);
    if (!res.ok) return toast.error(res.error);
    setDirty(false);
    toast.success('Draf disimpan', { description: 'Lanjutkan kapan saja dari Listing Saya → Draf.' });
    navigate('/my-listings?tab=draft');
  };

  const cancel = async () => {
    if (dirty && !(await confirm({ title: 'Buang perubahan?', description: 'Perubahan yang belum disimpan akan hilang.', confirmLabel: 'Buang', destructive: true }))) return;
    setDirty(false);
    navigate(listing ? `/listings/${listing.id}` : '/my-listings');
  };

  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-24">
      <Stepper labels={mode === 'create' ? ['Jenis', ...labels] : labels} current={mode === 'create' ? step + 1 : step} />

      <Card className="mt-5 p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-navy">{labels[step]}</h2>
          <TypeBadge type={form.type} />
        </div>

        {step === 0 && <RouteStep form={form} set={set} errors={errors} />}
        {step === 1 && form.type === 'weight' && <CapacityStep form={form} set={set} errors={errors} reservedKg={ctx?.reservedKg} />}
        {step === 1 && form.type === 'shopping' && <ProductsStep form={form} set={set} errors={errors} ctx={ctx} />}
        {step === 2 && <DetailsStep form={form} set={set} errors={errors} />}
        {step === 3 && <PreviewStep form={form} set={set} errors={errors} />}
      </Card>

      <div className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-4 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        <Button variant="ghost" onClick={step === 0 && !onBackToType ? cancel : goBack}>
          <ArrowLeft /> {step === 0 ? (onBackToType ? 'Ganti jenis' : 'Batal') : 'Kembali'}
        </Button>
        <div className="ml-auto flex gap-2">
          {isDraft && (
            <Button variant="outline" onClick={saveDraft}>
              <Save /> <span className="hidden sm:inline">Simpan</span> draf
            </Button>
          )}
          {step < lastStep ? (
            <Button onClick={goNext}>
              Lanjut <ArrowRight />
            </Button>
          ) : (
            <Button variant="accent" onClick={publish}>
              {isDraft ? (
                <>
                  <Rocket /> Terbitkan
                </>
              ) : (
                <>
                  <Check /> Simpan perubahan
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ labels, current }: { labels: string[]; current: number }) {
  return (
    <nav aria-label="Langkah pembuatan listing">
      <ol className="flex items-center gap-1.5">
        {labels.map((l, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={l} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={active ? 'step' : undefined}>
              <span className={cn('h-1.5 rounded-full transition-colors', done ? 'bg-teal-500' : active ? 'bg-navy' : 'bg-slate-200')} />
              <span className={cn('hidden truncate text-xs font-semibold sm:block', active ? 'text-navy' : done ? 'text-teal-700' : 'text-slate-400')}>
                {i + 1}. {l}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs font-semibold text-slate-500 sm:hidden">
        Langkah {current + 1} dari {labels.length}: <span className="text-navy">{labels[current]}</span>
      </p>
    </nav>
  );
}

type StepProps = {
  form: ListingForm;
  set: <K extends keyof ListingForm>(key: K, value: ListingForm[K]) => void;
  errors: FormErrors;
};

function CityInput({
  id,
  country,
  value,
  onChange,
  ...aria
}: { id?: string; country: string; value: string; onChange: (v: string) => void } & React.AriaAttributes) {
  const listId = `${id}-cities`;
  return (
    <>
      <Input {...aria} id={id} list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Pilih atau ketik kota" autoComplete="off" />
      <datalist id={listId}>
        {(getCountry(country)?.cities ?? []).map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}

function RouteStep({ form: f, set, errors }: StepProps) {
  const today = todayKey();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <legend className="sr-only">Asal</legend>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Dari</p>
          <Field id="f-originCountry" label="Negara asal" required error={errors.originCountry}>
            <Select value={f.originCountry} onChange={(e) => set('originCountry', e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-originCity" label="Kota asal" required error={errors.originCity}>
            <CityInput country={f.originCountry} value={f.originCity} onChange={(v) => set('originCity', v)} />
          </Field>
        </fieldset>
        <fieldset className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <legend className="sr-only">Tujuan</legend>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ke</p>
          <Field id="f-destCountry" label="Negara tujuan" required error={errors.destCountry}>
            <Select value={f.destCountry} onChange={(e) => set('destCountry', e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-destCity" label="Kota tujuan" required error={errors.destCity}>
            <CityInput country={f.destCountry} value={f.destCity} onChange={(v) => set('destCity', v)} />
          </Field>
        </fieldset>
      </div>
      {errors.route && (
        <p role="alert" className="-mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {errors.route}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          const { originCountry, originCity, destCountry, destCity } = f;
          set('originCountry', destCountry);
          set('originCity', destCity);
          set('destCountry', originCountry);
          set('destCity', originCity);
        }}
        className="-mt-3 text-sm font-semibold text-teal-700 hover:underline"
      >
        ⇄ Tukar asal & tujuan
      </button>

      <div className={cn('grid gap-4', f.type === 'shopping' ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        <Field
          id="f-departureDate"
          label="Tanggal berangkat"
          required={f.type === 'weight'}
          error={errors.departureDate}
          hint={f.type === 'shopping' ? 'Opsional' : undefined}
        >
          <Input type="date" min={today} value={f.departureDate} onChange={(e) => set('departureDate', e.target.value)} />
        </Field>
        {f.type === 'shopping' && (
          <Field id="f-arrivalDate" label="Tanggal tiba" required error={errors.arrivalDate} hint="Perkiraan barang tiba">
            <Input type="date" min={f.departureDate || today} value={f.arrivalDate} onChange={(e) => set('arrivalDate', e.target.value)} />
          </Field>
        )}
        <Field
          id="f-orderDeadline"
          label={f.type === 'weight' ? 'Batas terakhir titip' : 'Batas pemesanan'}
          required={f.type === 'weight'}
          error={errors.orderDeadline}
          hint={f.type === 'weight' ? 'Hari terakhir barang diserahkan' : 'Opsional'}
        >
          <Input type="date" min={today} value={f.orderDeadline} onChange={(e) => set('orderDeadline', e.target.value)} />
        </Field>
      </div>

      {f.type === 'shopping' && (
        <Field id="f-currency" label="Mata uang listing" required hint="Default untuk produk baru.">
          <Select value={f.currency} onChange={(e) => set('currency', e.target.value as Currency)} className="sm:w-60">
            <option value="SAR">SAR (Riyal Saudi)</option>
            <option value="AUD">AUD (Dolar Australia)</option>
            <option value="IDR">IDR (Rupiah)</option>
          </Select>
        </Field>
      )}
    </div>
  );
}

function CapacityStep({ form: f, set, errors, reservedKg }: StepProps & { reservedKg?: number }) {
  const cap = Number(f.capacityKg) || 0;
  const price = Number(f.pricePerKg) || 0;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="f-capacityKg" label="Total kuota (kg)" required error={errors.capacityKg} hint={reservedKg ? `${formatKg(reservedKg)} sudah diterima` : 'Maks. 200 kg'}>
          <Input type="number" inputMode="decimal" min={reservedKg || 0.5} step={0.5} value={f.capacityKg} onChange={(e) => set('capacityKg', e.target.value)} placeholder="cth. 20" />
        </Field>
        <Field id="f-pricePerKg" label="Biaya per kg" required error={errors.pricePerKg}>
          <Input type="number" inputMode="decimal" min={0} value={f.pricePerKg} onChange={(e) => set('pricePerKg', e.target.value)} placeholder={f.currency === 'SAR' ? 'cth. 25' : 'cth. 150000'} />
        </Field>
        <Field id="f-currency" label="Mata uang" required>
          <Select value={f.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
            <option value="SAR">SAR (Riyal Saudi)</option>
            <option value="AUD">AUD (Dolar Australia)</option>
            <option value="IDR">IDR (Rupiah)</option>
          </Select>
        </Field>
      </div>
      {cap > 0 && price > 0 && (
        <div className="rounded-2xl bg-teal-50 p-4 text-sm text-teal-900 ring-1 ring-teal-200">
          Jika penuh: <b>{formatMoney(cap * price, f.currency)}</b>. Dibayar langsung oleh penitip.
        </div>
      )}
    </div>
  );
}

function ProductsStep({ form: f, set, errors, ctx }: StepProps & { ctx?: ValidationContext }) {
  const update = (idx: number, patch: Partial<ProductForm>) => {
    set(
      'products',
      f.products.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );
  };
  const remove = (idx: number) => set('products', f.products.filter((_, i) => i !== idx));
  const duplicate = (idx: number) => {
    const copy = { ...f.products[idx]!, id: uuid(), name: `${f.products[idx]!.name} (salinan)` };
    set('products', [...f.products.slice(0, idx + 1), copy, ...f.products.slice(idx + 1)]);
  };

  return (
    <div className="space-y-4">
      {errors.products && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {errors.products}
        </p>
      )}
      <ol className="space-y-4">
        {f.products.map((p, i) => {
          const e = (k: string) => errors[`products.${i}.${k}`];
          const reserved = ctx?.reservedByProduct?.[p.id] ?? 0;
          const locked = ctx?.lockedProductIds?.includes(p.id);
          return (
            <li key={p.id} className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center gap-3">
                <ProductThumb imageUrl={p.imageUrl} category={p.category} className="h-12 w-12 shrink-0 rounded-xl text-2xl" />
                <p className="min-w-0 flex-1 truncate font-bold text-navy">
                  Produk {i + 1}
                  {p.name && <span className="font-normal text-slate-500"> · {p.name}</span>}
                </p>
                {reserved > 0 && <Badge tone="teal">{reserved} terjual</Badge>}
                <Button variant="ghost" size="icon-sm" onClick={() => duplicate(i)} aria-label={`Duplikat produk ${i + 1}`}>
                  <Copy />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(i)}
                  disabled={f.products.length <= 1 || locked}
                  aria-label={`Hapus produk ${i + 1}`}
                  title={locked ? 'Produk dengan pesanan aktif tidak dapat dihapus' : undefined}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`p-${i}-name`} label="Nama produk" required error={e('name')} className="sm:col-span-2">
                  <Input value={p.name} onChange={(ev) => update(i, { name: ev.target.value })} placeholder="cth. Kurma Ajwa 1 kg" maxLength={80} />
                </Field>
                <Field id={`p-${i}-category`} label="Kategori" required error={e('category')}>
                  <Select value={p.category} onChange={(ev) => update(i, { category: ev.target.value })}>
                    <option value="">Pilih kategori</option>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id={`p-${i}-variant`} label="Varian / ukuran" hint="Opsional">
                  <Input value={p.variant} onChange={(ev) => update(i, { variant: ev.target.value })} placeholder="cth. S / M / L" />
                </Field>
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <Field id={`p-${i}-unitPrice`} label="Harga" error={e('unitPrice')} hint="Opsional">
                    <Input type="number" inputMode="decimal" min={0} value={p.unitPrice} onChange={(ev) => update(i, { unitPrice: ev.target.value })} />
                  </Field>
                  <Field id={`p-${i}-currency`} label="Mata uang">
                    <Select value={p.currency} onChange={(ev) => update(i, { currency: ev.target.value as Currency | '' })}>
                      <option value="">Opsional</option>
                      <option value="SAR">SAR</option>
                      <option value="AUD">AUD</option>
                      <option value="IDR">IDR</option>
                    </Select>
                  </Field>
                </div>
                <Field id={`p-${i}-quantityAvailable`} label="Stok tersedia" required error={e('quantityAvailable')} hint={reserved ? `Min. ${reserved} (sudah diterima)` : undefined}>
                  <Input type="number" inputMode="numeric" min={reserved} step={1} value={p.quantityAvailable} onChange={(ev) => update(i, { quantityAvailable: ev.target.value })} />
                </Field>
                <Field id={`p-${i}-description`} label="Deskripsi singkat" hint="Opsional" className="sm:col-span-2">
                  <Textarea value={p.description} onChange={(ev) => update(i, { description: ev.target.value })} className="min-h-[64px]" maxLength={200} />
                </Field>
                <Field id={`p-${i}-lastOrderDate`} label="Batas pesan produk" error={e('lastOrderDate')} hint="Opsional">
                  <Input type="date" value={p.lastOrderDate} onChange={(ev) => update(i, { lastOrderDate: ev.target.value })} />
                </Field>
                <Field id={`p-${i}-terms`} label="Syarat & ketentuan produk" hint="Opsional. Terpisah dari S&K listing." className="sm:col-span-2">
                  <Textarea value={p.terms} onChange={(ev) => update(i, { terms: ev.target.value })} className="min-h-[64px]" maxLength={300} />
                </Field>
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-sm font-semibold text-navy">Foto atau video</p>
                  <MediaPicker imageUrl={p.imageUrl} videoUrl={p.videoUrl} label={`Foto atau video produk ${i + 1}`} onChange={(patch) => update(i, patch)} />
                  {e('imageUrl') && (
                    <p role="alert" className="mt-1.5 text-[13px] font-medium text-red-600">
                      {e('imageUrl')}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <Button variant="soft" className="w-full" onClick={() => set('products', [...f.products, emptyProduct()])} disabled={f.products.length >= 20}>
        <Plus /> Tambah produk
      </Button>
      <p className="text-xs text-slate-500">
        Pastikan setiap produk boleh dibawa melintasi perbatasan. Beberapa produk (mis. parfum beralkohol, obat, makanan segar) dapat dibatasi.
      </p>
    </div>
  );
}

function DetailsStep({ form: f, set, errors }: StepProps) {
  const suggestion = suggestTitle(f);
  const customHandover = f.handoverMethod && !HANDOVER_METHODS.includes(f.handoverMethod);
  return (
    <div className="space-y-5">
      <Field
        id="f-title"
        label="Judul listing"
        required
        error={errors.title}
        hint={
          suggestion && f.title !== suggestion ? (
            <button type="button" className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline" onClick={() => set('title', suggestion)}>
              <Sparkles className="h-3.5 w-3.5" /> Gunakan saran: “{suggestion}”
            </button>
          ) : (
            `${f.title.length}/100 karakter`
          )
        }
      >
        <Input value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={100} />
      </Field>
      <Field id="f-description" label="Deskripsi" required error={errors.description} hint="Perjalanan, maskapai, dan info penting.">
        <Textarea value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={1500} className="min-h-[120px]" />
      </Field>
      {f.type === 'weight' && (
        <Field id="f-permittedItemsNote" label="Barang yang diterima" hint="Opsional. cth. kurma, cokelat, pakaian.">
          <Textarea value={f.permittedItemsNote} onChange={(e) => set('permittedItemsNote', e.target.value)} className="min-h-[72px]" maxLength={500} />
        </Field>
      )}
      <Field id="f-prohibitedItemsNote" label="Barang yang tidak diterima" hint="Opsional.">
        <Textarea
          value={f.prohibitedItemsNote}
          onChange={(e) => set('prohibitedItemsNote', e.target.value)}
          className="min-h-[72px]"
          maxLength={500}
          placeholder="cth. cairan > 100 ml, baterai lithium lepas, obat tanpa resep, barang ilegal"
        />
      </Field>
      <Field id="f-handoverMethod" label="Cara serah terima" required error={errors.handoverMethod}>
        <Select value={customHandover ? '__custom' : f.handoverMethod} onChange={(e) => set('handoverMethod', e.target.value === '__custom' ? ' ' : e.target.value)}>
          <option value="">Pilih cara serah terima</option>
          {HANDOVER_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value="__custom">Lainnya (tulis sendiri)</option>
        </Select>
      </Field>
      {customHandover && (
        <Field id="f-handoverCustom" label="Jelaskan cara serah terima">
          <Input value={f.handoverMethod.trimStart()} onChange={(e) => set('handoverMethod', e.target.value || ' ')} maxLength={120} />
        </Field>
      )}
      <Field
        id="f-terms"
        label={f.type === 'weight' ? 'Syarat & ketentuan' : 'Syarat dan ketentuan listing'}
        required={f.type === 'weight'}
        error={errors.terms}
        hint={f.type === 'weight' ? 'Tanpa nomor telepon atau alamat.' : 'Opsional. Hanya tampil jika diisi. Berlaku untuk seluruh listing.'}
      >
        <Textarea value={f.terms} onChange={(e) => set('terms', e.target.value)} maxLength={1500} />
      </Field>
      <Field id="f-coverImageUrl" label="URL foto sampul" error={errors.coverImageUrl} hint="Opsional.">
        <Input type="url" value={f.coverImageUrl} onChange={(e) => set('coverImageUrl', e.target.value)} placeholder="https://…" />
      </Field>
      <SafetyNotice variant="compact" />
    </div>
  );
}

function PreviewStep({ form: f, set, errors }: StepProps) {
  const p = payloadFromForm(f);
  const fakeListing = { ...p, id: 'preview', ownerId: '', status: 'open', viewCount: 0, createdAt: '', updatedAt: '' } as Listing;
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="aspect-[21/9]">
          <ListingCover listing={fakeListing} />
        </div>
        <div className="space-y-3 p-4">
          <TypeBadge type={f.type} />
          <h3 className="text-lg font-bold text-navy">{p.title}</h3>
          <RouteDisplay listing={p} />
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {p.departureDate && <PreviewFact label="Berangkat" value={formatDate(p.departureDate)} />}
            {p.type === 'shopping' && p.arrivalDate && <PreviewFact label="Tiba" value={formatDate(p.arrivalDate)} />}
            {p.orderDeadline && <PreviewFact label={f.type === 'weight' ? 'Batas titip' : 'Batas pesan'} value={formatDate(p.orderDeadline)} />}
            {p.type === 'weight' && (
              <>
                <PreviewFact label="Kuota" value={formatKg(p.capacityKg)} />
                <PreviewFact label="Biaya" value={`${formatMoney(p.pricePerKg, p.currency)}/kg`} />
              </>
            )}
            <PreviewFact label="Serah terima" value={p.handoverMethod ?? '-'} />
          </dl>
          {p.type === 'shopping' && (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {p.products.map((x) => (
                <li key={x.id} className="flex items-center gap-3 p-2.5 text-sm">
                  <ProductThumb imageUrl={x.imageUrl} category={x.category} className="h-10 w-10 shrink-0 rounded-lg text-xl" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-navy">{x.name}</span>
                  <span className="text-slate-500">stok {x.quantityAvailable}</span>
                  <span className="font-bold text-navy">{formatProductPrice(x, p.currency)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="whitespace-pre-line text-sm text-slate-600">{p.description}</p>
          {p.terms && (
            <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">
              <b className="text-navy">S&K:</b> {p.terms}
            </p>
          )}
        </div>
      </div>

      <SafetyNotice />

      <div className={cn('rounded-2xl border p-4', errors.acknowledgedRules ? 'border-red-300 bg-red-50/50' : 'border-border')}>
        <Checkbox
          id="f-acknowledgedRules"
          checked={f.acknowledgedRules}
          onChange={(e) => set('acknowledgedRules', e.target.checked)}
          aria-invalid={errors.acknowledgedRules ? true : undefined}
          aria-describedby={errors.acknowledgedRules ? 'ack-error' : undefined}
          label={
            <>
              Saya memahami dan akan mematuhi aturan maskapai, bea cukai, serta larangan barang berbahaya/ilegal. Saya bertanggung jawab memeriksa setiap
              titipan. <span className="text-red-500">*</span>
            </>
          }
        />
        {errors.acknowledgedRules && (
          <p id="ack-error" role="alert" className="mt-2 pl-8 text-[13px] font-medium text-red-600">
            {errors.acknowledgedRules}
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}
