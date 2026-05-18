import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { Platform, View, type ViewProps } from 'react-native';
import { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import { cn } from '@/lib/utils';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';

const Sheet = DialogPrimitive.Root;

const SheetTrigger = DialogPrimitive.Trigger;

const SheetClose = DialogPrimitive.Close;

const SheetPortal = DialogPrimitive.Portal;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function SheetOverlay({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'> & {
  children?: React.ReactNode;
}) {
  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'absolute bottom-0 left-0 right-0 top-0 items-end justify-center bg-black/50',
          Platform.select({
            web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto',
          }),
          className
        )}
        {...props}
        asChild={Platform.OS !== 'web'}>
        <NativeOnlyAnimatedView>
          <NativeOnlyAnimatedView>
            <>{children}</>
          </NativeOnlyAnimatedView>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

function SheetContent({
  className,
  portalHost,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  portalHost?: string;
}) {
  return (
    <SheetPortal hostName={portalHost}>
      <SheetOverlay>
        <DialogPrimitive.Content
          className={cn(
            'bg-background border-border z-50 w-full max-w-[100%] flex-col gap-4 rounded-t-xl border p-6 shadow-lg shadow-black/5',
            Platform.select({
              web: 'animate-in fade-in-0 slide-in-from-bottom-10 duration-300',
            }),
            className
          )}
          {...props}>
          <NativeOnlyAnimatedView entering={SlideInDown.duration(250)} exiting={SlideOutDown.duration(200)}>
            <View className="flex-col gap-4">
              <View className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
              <>{children}</>
            </View>
          </NativeOnlyAnimatedView>
        </DialogPrimitive.Content>
      </SheetOverlay>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: ViewProps) {
  return (
    <View className={cn('flex-col gap-2', className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-foreground text-lg font-semibold leading-none', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
