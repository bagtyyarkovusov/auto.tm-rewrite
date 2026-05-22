import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable, type PressableProps } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-lg border border-transparent shadow-none',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-foreground active:bg-foreground/90 disabled:bg-muted disabled:border disabled:border-border',
          Platform.select({ web: 'hover:bg-foreground/90' })
        ),
        brand: cn(
          'bg-primary active:bg-primary/90 shadow-sm shadow-black/5 disabled:bg-muted disabled:border disabled:border-border disabled:shadow-none',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn(
          'bg-destructive active:bg-destructive/90 shadow-sm shadow-black/5 disabled:bg-muted disabled:border disabled:border-border disabled:shadow-none',
          Platform.select({
            web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          })
        ),
        outline: cn(
          'border-border bg-background active:bg-muted disabled:bg-muted disabled:border-border dark:border-input dark:bg-input/20 dark:active:bg-input/40',
          Platform.select({
            web: 'hover:bg-muted dark:hover:bg-input/40',
          })
        ),
        secondary: cn(
          'bg-muted active:bg-muted/80 disabled:bg-muted disabled:border disabled:border-border',
          Platform.select({ web: 'hover:bg-muted/80' })
        ),
        ghost: cn(
          'active:bg-muted dark:active:bg-muted/70 disabled:bg-muted disabled:border disabled:border-border',
          Platform.select({ web: 'hover:bg-muted dark:hover:bg-muted/70' })
        ),
        link: 'disabled:text-muted-foreground',
      },
      size: {
        default: cn('h-12 px-4 py-3', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('h-9 gap-1.5 rounded-md px-3', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('h-[52px] px-5 py-3', Platform.select({ web: 'has-[>svg]:px-4' })),
        pill: 'h-[52px] rounded-full px-5 py-3',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-sm font-medium',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-background disabled:text-muted-foreground',
        brand: 'text-primary-foreground disabled:text-muted-foreground',
        destructive: 'text-white disabled:text-muted-foreground',
        outline: cn(
          'text-foreground group-active:text-foreground disabled:text-muted-foreground',
          Platform.select({ web: 'group-hover:text-foreground' })
        ),
        secondary: 'text-foreground disabled:text-muted-foreground',
        ghost: 'text-foreground group-active:text-foreground disabled:text-muted-foreground',
        link: cn(
          'text-info-500 group-active:underline disabled:text-muted-foreground',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        pill: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = PressableProps & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
