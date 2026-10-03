import type { ServerResponse } from "node:http";
import vue from "@vitejs/plugin-vue";
import { type HtmlTagDescriptor, type Plugin, defineConfig } from "vite";
import { DATA_DIR } from "./scripts/lib/paths.js";
import { readEntries } from "./scripts/lib/read.js";
import { siteFiles } from "./scripts/lib/site.js";
import { entryProblems } from "./scripts/lib/validate.js";
import { STORAGE_KEYS } from "./src/app/storage.js";
import { ROADMAP_INDEX_FILE } from "./src/shared/roadmap.js";
import { PAGE_TITLES, ROADMAP_PATH } from "./src/shared/site.js";

/** The latin halves of the two faces in base.css; every page draws text in both. */
const FONTS = ["bricolage-grotesque-latin.woff2", "nunito-sans-latin.woff2"];

/** Runs before first paint, so a dark reader never sees the light page flash; useTheme takes over from here. */
const THEME_SCRIPT = `try {
  let theme = localStorage.getItem(${JSON.stringify(STORAGE_KEYS.theme)});
  if (theme !== "dark" && theme !== "light")
    theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
} catch {}`;

/** The page's data, fetched alongside the bundle instead of after it; the roadmap file path matches roadmapFile. */
function dataPreloadScript(base: string): string {
  return `{
  const base = ${JSON.stringify(base)};
  const roadmap = ${JSON.stringify(base + ROADMAP_PATH)};
  const onRoadmap = location.pathname === roadmap || location.pathname === roadmap.slice(0, -1);
  const topic = new URLSearchParams(location.search).get("topic");
  const files = !onRoadmap
    ? ["articles.json"]
    : [${JSON.stringify(ROADMAP_INDEX_FILE)}, ...(topic ? [\`roadmaps/\${encodeURIComponent(topic)}.json\`] : [])];
  for (const file of files) {
    const link = Object.assign(document.createElement("link"), { rel: "preload", as: "fetch", crossOrigin: "anonymous", href: base + file });
    document.head.append(link);
  }
}`;
}

/** The head every page gets, written once here instead of in each HTML file. */
function sharedHead(): Plugin {
  let base = "/";
  return {
    name: "shared-head",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml(): HtmlTagDescriptor[] {
      return [
        { tag: "script", children: THEME_SCRIPT, injectTo: "head" },
        { tag: "script", children: dataPreloadScript(base), injectTo: "head" },
        ...FONTS.map(
          (font): HtmlTagDescriptor => ({
            tag: "link",
            attrs: {
              rel: "preload",
              href: `${base}fonts/${font}`,
              as: "font",
              type: "font/woff2",
              crossorigin: true,
            },
            injectTo: "head",
          }),
        ),
      ];
    },
  };
}

/** Build only: the roadmap page is index.html under its own title; in dev, Vite's SPA fallback serves index.html there. */
function roadmapPage(): Plugin {
  return {
    name: "roadmap-page",
    apply: "build",
    generateBundle: {
      // After vite:build-html, which is what puts index.html in the bundle.
      order: "post",
      handler(_options, bundle) {
        const index = bundle["index.html"];
        if (index?.type !== "asset") throw new Error("roadmap-page: no index.html in the bundle");
        const source = String(index.source).replace(
          `<title>${PAGE_TITLES.blog}</title>`,
          `<title>${PAGE_TITLES.roadmap}</title>`,
        );
        if (!source.includes(PAGE_TITLES.roadmap))
          throw new Error("roadmap-page: index.html title not found");
        this.emitFile({ type: "asset", fileName: `${ROADMAP_PATH}index.html`, source });
      },
    },
  };
}

/** Dev only: builds the data files per request straight from data/, reports entry problems, and reloads on edits. */
function liveData(): Plugin {
  return {
    name: "live-data",
    apply: "serve",
    configureServer(server) {
      // Terminal always; the overlay can miss a page whose socket is still reconnecting.
      const report = (message: string): void => {
        server.config.logger.error(message, { timestamp: true });
        server.hot.send({ type: "error", err: { message, stack: "" } });
      };
      const serve = async (res: ServerResponse, file: string): Promise<void> => {
        const inputs = await readEntries();
        // Served anyway, so one bad tag does not blank the page; the build still refuses it.
        const problems = entryProblems(inputs);
        if (problems.length) report(`${problems.length} entry problems:\n${problems.join("\n")}`);
        const body = (await siteFiles(inputs)).get(file);
        if (body === undefined) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
      };

      server.middlewares.use((req, res, next) => {
        const match = /(?:^|\/)(articles\.json|roadmaps\/[^/?]+\.json)(?:\?|$)/.exec(req.url ?? "");
        if (!match) return next();
        // A half-typed JSON file is the normal case here, not a crash.
        serve(res, match[1]).catch((error: unknown) => {
          res.statusCode = 500;
          res.end(String(error));
          report(String(error));
        });
      });

      const reload = (file: string): void => {
        if (file.startsWith(DATA_DIR) && file.endsWith(".json"))
          server.hot.send({ type: "full-reload" });
      };
      server.watcher.on("change", reload);
      server.watcher.on("add", reload);
      server.watcher.on("unlink", reload);
    },
  };
}

export default defineConfig({
  base: "/engineer-blog/",
  plugins: [vue(), sharedHead(), roadmapPage(), liveData()],
});
