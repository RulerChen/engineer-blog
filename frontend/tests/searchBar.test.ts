import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchBar from "../src/components/SearchBar.vue";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("SearchBar", () => {
  it("debounces input before emitting update:modelValue", async () => {
    const wrapper = mount(SearchBar, { props: { modelValue: "" } });
    await wrapper.find("input").setValue("k8s");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    vi.advanceTimersByTime(200);
    expect(wrapper.emitted("update:modelValue")).toEqual([["k8s"]]);
  });

  it("only emits the final value of a burst", async () => {
    const wrapper = mount(SearchBar, { props: { modelValue: "" } });
    await wrapper.find("input").setValue("k");
    vi.advanceTimersByTime(100);
    await wrapper.find("input").setValue("k8s");
    vi.advanceTimersByTime(200);
    expect(wrapper.emitted("update:modelValue")).toEqual([["k8s"]]);
  });
});
