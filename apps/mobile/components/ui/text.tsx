import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

import { cn } from '@/lib/utils';

const textVariants = cva(
  cn(
    'font-sans text-base leading-normal text-foreground',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'font-heading text-3xl font-bold leading-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        h2: cn(
          'font-heading text-2xl font-semibold leading-snug',
          Platform.select({ web: 'scroll-m-20 first:mt-0' })
        ),
        h3: cn('font-heading text-xl font-semibold leading-snug', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('font-heading text-lg font-semibold leading-snug', Platform.select({ web: 'scroll-m-20' })),
        p: 'leading-relaxed',
        blockquote: 'border-l-2 border-border pl-3 italic text-muted-foreground',
        code: cn(
          'relative rounded-md bg-muted px-1.5 py-1 font-mono text-sm font-medium'
        ),
        lead: 'text-lg leading-relaxed text-muted-foreground',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-snug',
        muted: 'text-muted-foreground text-sm',
        label: 'text-sm font-medium leading-snug text-foreground',
        caption: 'text-xs font-medium leading-snug text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
