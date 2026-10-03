import { ALIASES } from "../shared/tags.js";
import { DATE_PRESETS, type DatePreset, type FilterState, emptyFilter } from "./filter.js";

/** Only what differs from the empty filter, so a plain visit keeps a bare URL. */
export function stateToQuery(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.companies.length > 0) params.set("companies", state.companies.join(","));
  if (state.tags.length > 0) {
    params.set("tags", state.tags.join(","));
    if (state.tagMode === "all") params.set("tagMode", "all");
  }
  if (state.series) params.set("series", state.series);
  if (state.datePreset !== "all") params.set("date", state.datePreset);
  if (state.datePreset === "custom") {
    if (state.dateFrom) params.set("from", state.dateFrom);
    if (state.dateTo) params.set("to", state.dateTo);
  }
  return params.toString();
}

export function queryToState(search: string): FilterState {
  const params = new URLSearchParams(search);
  const date = params.get("date") as DatePreset;
  const datePreset = DATE_PRESETS.includes(date) ? date : "all";
  const list = (key: string): string[] => params.get(key)?.split(",").filter(Boolean) ?? [];
  return {
    ...emptyFilter(),
    query: params.get("q") ?? "",
    companies: list("companies"),
    // A retired id reads as its replacement; two retired ids can share one.
    tags: [...new Set(list("tags").map((id) => ALIASES.get(id) ?? id))],
    tagMode: params.get("tagMode") === "all" ? "all" : "any",
    series: params.get("series") || null,
    datePreset,
    dateFrom: datePreset === "custom" ? params.get("from") : null,
    dateTo: datePreset === "custom" ? params.get("to") : null,
  };
}
