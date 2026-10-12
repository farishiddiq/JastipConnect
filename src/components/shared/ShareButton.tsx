import * as React from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/form';

/** Native share where supported, clipboard fallback, and a manual-copy dialog as last resort. */
export function ShareButton({ path, title, text, label = 'Bagikan', ...props }: ButtonProps & { path: string; title: string; text?: string; label?: string }) {
  const [manualUrl, setManualUrl] = React.useState<string | null>(null);
  const url = `${window.location.origin}${path}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Tautan disalin', { description: url });
    } catch {
      setManualUrl(url);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={share} {...props}>
        <Share2 /> {label}
      </Button>
      <Dialog open={!!manualUrl} onOpenChange={(o) => !o && setManualUrl(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salin tautan</DialogTitle>
            <DialogDescription>Browser tidak mengizinkan salin otomatis. Salin tautan di bawah secara manual.</DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-6">
            <Input readOnly value={manualUrl ?? ''} onFocus={(e) => e.currentTarget.select()} autoFocus aria-label="Tautan listing" />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
