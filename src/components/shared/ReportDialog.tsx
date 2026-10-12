import * as React from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/form';
import { createReport, REPORT_REASONS } from '@/services/moderationService';
import { useAuth } from './AccountSwitcher';
import { cn } from '@/lib/utils';

export function ReportButton({
  targetType,
  targetId,
  targetLabel,
  ...btn
}: ButtonProps & { targetType: 'listing' | 'user'; targetId: string; targetLabel: string }) {
  const { requireUser } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string>();

  const start = () => {
    if (!requireUser('Pilih akun demo untuk mengirim laporan.')) return;
    setReason('');
    setDescription('');
    setError(undefined);
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = requireUser();
    if (!uid) return;
    if (!reason) return setError('Pilih alasan laporan.');
    const res = createReport({ reporterId: uid, targetType, targetId, reason, description });
    if (!res.ok) return setError(res.error);
    toast.success('Laporan terkirim', { description: 'Moderator demo akan meninjaunya di panel admin.' });
    setOpen(false);
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={start} {...btn} className={cn('text-slate-500', btn.className)}>
        <Flag /> Laporkan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle>Laporkan {targetType === 'listing' ? 'listing' : 'pengguna'}</DialogTitle>
              <DialogDescription>“{targetLabel}”. Laporan akan masuk ke antrean moderasi demo.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-navy">
                  Alasan<span className="text-red-500">*</span>
                </legend>
                <div className="grid gap-2" role="radiogroup">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className={cn(
                        'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition-colors',
                        reason === r ? 'border-teal-400 bg-teal-50/60 font-semibold' : 'border-border hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => {
                          setReason(r);
                          setError(undefined);
                        }}
                        className="h-4 w-4 accent-teal-600"
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field id="report-desc" label="Detail tambahan" hint="Opsional, maks. 500 karakter." error={error}>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="Ceritakan apa yang terjadi…" />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="destructive">
                Kirim laporan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
