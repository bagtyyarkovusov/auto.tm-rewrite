// Test-only host components. Both Vite imports and RNTL's CommonJS require use
// this adapter, so no React Native native bridge or Flow source runs in Node.
const React = require("react");
const host = (name, defaults = {}) => {
  const Component = React.forwardRef(({ children, ...props }, ref) =>
    React.createElement(name, { ...defaults, ...props, ref }, children));
  Component.displayName = name;
  return Component;
};
const View = host("View");
const Text = host("Text");
const Pressable = React.forwardRef(({ children, disabled, accessibilityState, ...props }, ref) =>
  React.createElement("View", {
    accessible: true, ...props, ref, disabled,
    onStartShouldSetResponder: () => !disabled,
    accessibilityState: { ...accessibilityState, disabled: disabled ?? accessibilityState?.disabled },
  }, typeof children === "function" ? children({ pressed: false }) : children));
Pressable.displayName = "Pressable";
const flatten = (style) => Array.isArray(style)
  ? Object.assign({}, ...style.map(flatten)) : style || {};
module.exports = {
  View, Text, Pressable, TextInput: host("TextInput"), Image: host("Image"),
  ScrollView: host("RCTScrollView"), ActivityIndicator: host("ActivityIndicator"),
  Switch: host("RCTSwitch", { accessible: true }),
  Modal: ({ visible = true, children, ...props }) => visible
    ? React.createElement("Modal", props, children) : null,
  FlatList: ({ data = [], renderItem, keyExtractor, ...props }) => React.createElement("RCTScrollView", props,
    data.map((item, index) => React.createElement(React.Fragment,
      { key: keyExtractor?.(item, index) ?? index }, renderItem({ item, index })))),
  Platform: { OS: "ios", select: (options) => options.ios ?? options.native ?? options.default },
  StyleSheet: { create: (styles) => styles, flatten, hairlineWidth: 1,
    absoluteFillObject: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  useColorScheme: () => "light",
};
