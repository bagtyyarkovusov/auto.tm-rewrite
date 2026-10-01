import { createRequire, Module } from "node:module";

import { beforeEach, vi } from "vitest";

// vi.mock cannot intercept CommonJS require. Register the same test adapter
// used by Vite's exact react-native alias before RNTL loads in this worker.
const requireNative = createRequire(import.meta.url);
const nativePath = requireNative.resolve("react-native");
const nativeModule = new Module(nativePath);
nativeModule.exports = requireNative("./native-host.cjs");
nativeModule.loaded = true;
requireNative.cache[nativePath] = nativeModule;

vi.mock("nativewind", () => ({ cssInterop: vi.fn(), remapProps: vi.fn(),
  useColorScheme: () => ({ colorScheme: "light", setColorScheme: vi.fn() }) }));
vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  return new Proxy({}, { has: () => true, get: (_, name) => name === "then" ? undefined
    : name === "__esModule" ? true : () => React.createElement("Icon", { name }) });
});
vi.mock("expo-image", async () => ({ Image: (await import("react-native")).Image }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const routerMock = vi.hoisted(() => ({
  push: vi.fn(), navigate: vi.fn(), replace: vi.fn(), back: vi.fn(),
  canGoBack: vi.fn(() => true), setParams: vi.fn(),
  dismissTo: vi.fn(), dismissAll: vi.fn(), canDismiss: vi.fn(() => true),
}));
const routeParams = vi.hoisted(() => ({} as Record<string, string>));
vi.mock("expo-router", () => ({
  router: routerMock, useRouter: () => routerMock,
  useLocalSearchParams: () => routeParams,
  useFocusEffect: vi.fn(),
}));
beforeEach(() => {
  Object.values(routerMock).forEach((mock) => mock.mockClear());
  Object.keys(routeParams).forEach((key) => Reflect.deleteProperty(routeParams, key));
});

export { routerMock, routeParams };

// The installed Slot distribution retains JSX in .mjs. Its clone behavior is
// enough for this host adapter; native primitive overlays are mocked per spec.
vi.mock("@rn-primitives/slot", async () => {
  const React = await import("react");
  const Slot = ({ children, ...props }: { children: React.ReactElement; [key: string]: unknown }) =>
    React.cloneElement(children, props);
  return { Slot, Text: Slot, View: Slot, Pressable: Slot };
});

vi.mock("@/components/ui/dropdown-menu", async () => {
  const shell = await import("./native-overlays");
  return { DropdownMenu: shell.Menu, DropdownMenuTrigger: shell.MenuTrigger,
    DropdownMenuContent: shell.MenuContent, DropdownMenuItem: shell.MenuItem,
    DropdownMenuSeparator: shell.Container };
});
vi.mock("@/components/ui/sheet", async () => {
  const shell = await import("./native-overlays");
  return { Sheet: shell.Overlay, SheetContent: shell.Container,
    SheetHeader: shell.Container, SheetTitle: shell.TextContainer,
    SheetDescription: shell.TextContainer, SheetFooter: shell.Container, SheetClose: shell.MenuItem };
});
vi.mock("@/components/ui/alert-dialog", async () => {
  const shell = await import("./native-overlays");
  return { AlertDialog: shell.Overlay, AlertDialogContent: shell.Container,
    AlertDialogAction: shell.MenuItem, AlertDialogCancel: shell.MenuItem,
    AlertDialogHeader: shell.Container, AlertDialogTitle: shell.TextContainer,
    AlertDialogDescription: shell.TextContainer, AlertDialogFooter: shell.Container };
});
vi.mock("@rn-primitives/separator", async () => ({ Root: (await import("react-native")).View }));
