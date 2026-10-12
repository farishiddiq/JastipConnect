import * as React from 'react';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

const ConfirmContext = React.createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);

/** Promise-based confirmation dialog: `if (await confirm({...})) doIt()`. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<(v: boolean) => void>();

  const confirm = React.useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <DialogContent role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{opts?.title}</DialogTitle>
            {opts?.description && <DialogDescription asChild><div>{opts.description}</div></DialogDescription>}
          </DialogHeader>
          <DialogBody className="py-1" />
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {opts?.cancelLabel ?? 'Batal'}
            </Button>
            <Button variant={opts?.destructive ? 'destructive' : 'default'} onClick={() => close(true)} autoFocus>
              {opts?.confirmLabel ?? 'Ya, lanjutkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => React.useContext(ConfirmContext);
