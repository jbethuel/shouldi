import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import background from "../entrypoints/background";

beforeEach(() => {
  fakeBrowser.reset();
});

describe("background", () => {
  it("opens the settings page after a new install", async () => {
    const open = vi.spyOn(fakeBrowser.runtime, "openOptionsPage").mockResolvedValue();
    background.main();
    await fakeBrowser.runtime.onInstalled.trigger({ reason: "install" });
    expect(open).toHaveBeenCalledOnce();
  });

  it("does not open the settings page after an update", async () => {
    const open = vi.spyOn(fakeBrowser.runtime, "openOptionsPage").mockResolvedValue();
    background.main();
    await fakeBrowser.runtime.onInstalled.trigger({ reason: "update", previousVersion: "0.1.0" });
    expect(open).not.toHaveBeenCalled();
  });
});
