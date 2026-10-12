import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition duration-150 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:!bg-slate-200 disabled:!text-slate-600 disabled:!shadow-none active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-navy text-white hover:bg-navy-600 shadow-sm',
        accent: 'bg-teal-500 text-deep hover:bg-teal-400 shadow-sm',
        outline: 'border border-border bg-white text-navy hover:bg-slate-50 hover:border-slate-300',
        ghost: 'text-navy hover:bg-slate-100',
        soft: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        'destructive-outline': 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
        link: 'text-teal-700 underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 px-3 text-[13px]',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
        'icon-sm': 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...(!asChild ? { type: type ?? 'button' } : {})}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
