import { Portal } from '@rn-primitives/portal';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/navigation/tabBarHeight';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';
/** `aboveTabBar` keeps a toast clear of the tab bar on a tab screen. */
type ToastPlacement = 'top' | 'aboveTabBar';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  placement?: ToastPlacement;
  /** One button on the toast, such as Undo. Pressing it also closes the toast. */
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const show = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = React.useMemo(() => ({ toasts, show, dismiss }), [toasts, show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const ctx = React.useContext(ToastContext);
  const insets = useSafeAreaInsets();
  if (!ctx) return null;

  const top = ctx.toasts.filter((toast) => toast.placement !== 'aboveTabBar');
  const aboveTabBar = ctx.toasts.filter((toast) => toast.placement === 'aboveTabBar');

  return (
    <Portal name="toast-viewport">
      {top.length > 0 && (
        <View
          testID="toast-viewport-top"
          className="absolute left-0 right-0 top-0 z-[100] flex-col items-center gap-2 px-4 pt-12 pointer-events-none">
          {top.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => ctx.dismiss(toast.id)} />
          ))}
        </View>
      )}
      {aboveTabBar.length > 0 && (
        <View
          testID="toast-viewport-above-tab-bar"
          style={{ bottom: TAB_BAR_HEIGHT + insets.bottom + 8 }}
          className="absolute left-0 right-0 z-[100] flex-col items-center gap-2 px-4 pointer-events-none">
          {aboveTabBar.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => ctx.dismiss(toast.id)} />
          ))}
        </View>
      )}
    </Portal>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const duration = toast.duration ?? 3000;
  const dismissRef = React.useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Each toast owns its timer, so a later toast neither restarts nor shortens it.
  React.useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const fromBottom = toast.placement === 'aboveTabBar';

  return (
    <Animated.View
      entering={(fromBottom ? FadeInDown : FadeInUp).duration(200)}
      exiting={(fromBottom ? FadeOutDown : FadeOutUp).duration(150)}
      className="pointer-events-auto w-full max-w-sm">
      <Pressable onPress={onDismiss} accessibilityLiveRegion="polite">
        <View
          className={cn(
            'flex-row items-center gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-black/5',
            toast.variant === 'destructive' &&
              'border-destructive/20 bg-destructive/10',
            toast.variant === 'success' && 'border-success-500/20 bg-success-500/10',
            toast.variant === 'warning' && 'border-warning-500/20 bg-warning-500/10',
            toast.variant === 'info' && 'border-info-500/20 bg-info-500/10',
            (!toast.variant || toast.variant === 'default') &&
              'bg-card border-border',
            toast.action && 'py-1'
          )}>
          <View className="flex-1">
            <Text
              className={cn(
                'text-sm font-medium',
                toast.variant === 'destructive' && 'text-destructive',
                toast.variant === 'success' && 'text-success-500',
                toast.variant === 'warning' && 'text-warning-500',
                toast.variant === 'info' && 'text-info-500',
                (!toast.variant || toast.variant === 'default') && 'text-foreground'
              )}>
              {toast.title}
            </Text>
            {toast.description ? (
              <Text
                className={cn(
                  'text-sm mt-1',
                  toast.variant === 'destructive'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}>
                {toast.description}
              </Text>
            ) : null}
          </View>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              onPress={() => {
                toast.action?.onPress();
                onDismiss();
              }}
              className="min-h-11 min-w-11 items-center justify-center rounded-md px-2 active:bg-muted">
              <Text className="text-sm font-semibold text-primary">{toast.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export { ToastProvider, useToast, ToastViewport };
export type { Toast, ToastAction, ToastPlacement, ToastVariant };
