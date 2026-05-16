const runtimePackages = ["@auto-tm/db", "@auto-tm/contracts"];

for (const packageName of runtimePackages) {
  require(packageName);
  console.log(`${packageName}: ok`);
}
