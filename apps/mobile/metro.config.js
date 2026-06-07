const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Keep test files out of the native bundle. Expo Router's require.context scans
// `app/**`, so a `*.spec`/`*.test` file placed there is otherwise bundled (and
// one importing a Node builtin like `fs` breaks the build) and registered as a
// bogus route. Screen/unit tests live outside `app/` (e.g. test/screens, src);
// this blockList is the backstop so a stray test file can never break the bundle.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /\.(test|spec)\.[cm]?[jt]sx?$/,
];

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
