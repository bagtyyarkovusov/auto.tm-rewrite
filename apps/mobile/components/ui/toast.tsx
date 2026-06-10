import { Portal } from '@rn-primitives/portal';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
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

  React.useEffect(() => {
    toasts.forEach((toast) => {
      const duration = toast.duration ?? 3000;
      const timer = setTimeout(() => {
        dismiss(toast.id);
      }, duration);
      return () => clearTimeout(timer);
    });
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) return null;

  return (
    <Portal name="toast-viewport">
      <View
        className={cn(
          'absolute left-0 right-0 top-0 z-[100] flex-col items-center gap-2 px-4 pt-12 pointer-events-none'
        )}>
        {ctx.toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => ctx.dismiss(toast.id)} />
        ))}
      </View>
    </Portal>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(150)}
      className="pointer-events-auto w-full max-w-sm">
      <Pressable onPress={onDismiss}>
        <View
          className={cn(
            'flex-row items-center gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-black/5',
            toast.variant === 'destructive' &&
              'border-destructive/20 bg-destructive/10',
            toast.variant === 'success' && 'border-success-500/20 bg-success-500/10',
            toast.variant === 'warning' && 'border-warning-500/20 bg-warning-500/10',
            toast.variant === 'info' && 'border-info-500/20 bg-info-500/10',
            (!toast.variant || toast.variant === 'default') &&
              'bg-card border-border'
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
        </View>
      </Pressable>
    </Animated.View>
  );
}

export { ToastProvider, useToast, ToastViewport };
export type { Toast, ToastVariant };
