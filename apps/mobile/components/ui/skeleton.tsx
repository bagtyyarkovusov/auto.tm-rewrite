import type { View } from 'react-native';

import { Pulse } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

/**
 * A placeholder in the shape of what is loading. It sits one tone past the
 * tonal surface so it shows on the page and on a card, and breathes with a
 * slow opacity pulse on the UI thread; Reduce Motion leaves it still.
 * See docs/prd/ui/components/78-11-skeleton.md.
 */
function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <Pulse className={cn('bg-accent rounded-md', className)} {...props} />;
}

export { Skeleton };
