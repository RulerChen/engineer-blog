import { describe, expect, it } from "vitest";
import { emptyFilter, type FilterState } from "../src/lib/filter.js";
import { queryToState, stateToQuery } from "../src/lib/urlState.js";

describe("stateToQuery", () => {
  it("serializes only non-default fields", () => {
    expect(stateToQuery(emptyFilter())).toBe("");
    expect(stateToQuery({ ...emptyFilter(), query: "graphql" })).toBe("q=graphql");
  });
  it("serializes companies, tags, and presets", () => {
    const state: FilterState = {
      query: "k8s",
      companies: ["meta", "google"],
      tags: ["ml", "infra"],
      datePreset: "month",
      dateFrom: null,
      dateTo: null,
    };
    const params = new URLSearchParams(stateToQuery(state));
    expect(params.get("q")).toBe("k8s");
    expect(params.get("companies")).toBe("meta,google");
    expect(params.get("tags")).toBe("ml,infra");
    expect(params.get("date")).toBe("month");
  });
  it("serializes custom range dates", () => {
    const state: FilterState = {
      ...emptyFilter(),
      datePreset: "custom",
      dateFrom: "2026-01-01",
      dateTo: "2026-07-01",
    };
    const params = new URLSearchParams(stateToQuery(state));
    expect(params.get("date")).toBe("custom");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-07-01");
  });
});

describe("queryToState", () => {
  it("round-trips every field", () => {
    const state: FilterState = {
      query: "search text",
      companies: ["uber"],
      tags: ["mobile"],
      datePreset: "custom",
      dateFrom: "2026-01-01",
      dateTo: null,
    };
    expect(queryToState(stateToQuery(state))).toEqual(state);
  });
  it("accepts a leading question mark", () => {
    expect(queryToState("?q=x").query).toBe("x");
  });
  it("falls back to defaults for garbage input", () => {
    expect(queryToState("date=bogus&companies=")).toEqual(emptyFilter());
  });
});
