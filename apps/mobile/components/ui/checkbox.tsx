import { Check } from 'lucide-react-native';
import * as CheckboxPrimitive from '@rn-primitives/checkbox';

import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'h-6 w-6 rounded-md border border-input bg-card items-center justify-center active:bg-muted disabled:opacity-50',
        props.checked && 'bg-primary border-primary',
        className
      )}
      {...props}>
      <CheckboxPrimitive.Indicator>
        <Icon as={Check} className="size-4 text-primary-foreground" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
