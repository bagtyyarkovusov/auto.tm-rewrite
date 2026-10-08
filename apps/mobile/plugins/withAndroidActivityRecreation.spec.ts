import { describe, expect, it } from "vitest";

import plugin from "./withAndroidActivityRecreation";

const { addConfigChanges, addHostDestroyOnRelaunch } = plugin;

const TEMPLATE_CONFIG_CHANGES =
  "keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize";

const MAIN_ACTIVITY = `package tm.auto.app

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "main"

  override fun invokeDefaultOnBackPressed() {
      super.invokeDefaultOnBackPressed()
  }
}
`;

describe("the Activity's claimed configuration changes", () => {
  it("claims display size, font size and system language changes, and keeps the template's", () => {
    expect(addConfigChanges(TEMPLATE_CONFIG_CHANGES).split("|")).toEqual([
      ...TEMPLATE_CONFIG_CHANGES.split("|"),
      "density",
      "fontScale",
      "locale",
      "layoutDirection",
    ]);
  });

  it("adds nothing twice", () => {
    const once = addConfigChanges(TEMPLATE_CONFIG_CHANGES);

    expect(addConfigChanges(once)).toBe(once);
    expect(addConfigChanges("locale|uiMode")).toBe("locale|uiMode|density|fontScale|layoutDirection");
  });

  it("claims them on an Activity that claimed nothing", () => {
    expect(addConfigChanges(undefined)).toBe("density|fontScale|locale|layoutDirection");
  });
});

describe("MainActivity on an in-place relaunch", () => {
  it("tells React Native the Activity is gone before the Activity is destroyed", () => {
    const patched = addHostDestroyOnRelaunch(MAIN_ACTIVITY);
    const method = patched.slice(patched.indexOf("override fun onDestroy()"));

    expect(method.indexOf("reactHost?.onHostDestroy(this)")).toBeGreaterThan(-1);
    expect(method.indexOf("reactHost?.onHostDestroy(this)")).toBeLessThan(
      method.indexOf("super.onDestroy()"),
    );
    expect(method).toContain("if (isChangingConfigurations)");
  });

  it("adds the method inside the class and keeps the rest of the file", () => {
    const patched = addHostDestroyOnRelaunch(MAIN_ACTIVITY);

    expect(patched.startsWith(MAIN_ACTIVITY.slice(0, MAIN_ACTIVITY.lastIndexOf("}")).trimEnd())).toBe(true);
    expect(patched.trimEnd().endsWith("}")).toBe(true);
    expect(patched.match(/\{/g)?.length).toBe(patched.match(/\}/g)?.length);
  });

  it("adds it once when prebuild runs again", () => {
    const once = addHostDestroyOnRelaunch(MAIN_ACTIVITY);

    expect(addHostDestroyOnRelaunch(once)).toBe(once);
  });

  it("refuses a MainActivity that already overrides onDestroy", () => {
    const withDestroy = MAIN_ACTIVITY.replace(
      "override fun getMainComponentName",
      "override fun onDestroy() { super.onDestroy() }\n\n  override fun getMainComponentName",
    );

    expect(() => addHostDestroyOnRelaunch(withDestroy)).toThrow(/already overrides onDestroy/);
  });
});
