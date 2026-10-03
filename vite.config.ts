import type { ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { type HtmlTagDescriptor, type Plugin, defineConfig } from "vite";
import { DATA_DIR } from "./scripts/lib/paths.js";
import { readEntries } from "./scripts/lib/read.js";
import { siteFiles } from "./scripts/lib/site.js";
import { entryProblems } from "./scripts/lib/validate.js";
import { STORAGE_KEYS } from "./src/app/storage.js";

/** The latin halves of the two faces in base.css; every page draws text in both. */
const FONTS = ["bricolage-grotesque-latin.woff2", "nunito-sans-latin.woff2"];

/** Runs before first paint, so a dark reader never sees the light page flash; useTheme takes over from here. */
const THEME_SCRIPT = `try {
  let theme = localStorage.getItem(${JSON.stringify(STORAGE_KEYS.theme)});
  if (theme !== "dark" && theme !== "light")
    theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
} catch {}`;

/** The head both index.html files share, written once here instead of twice there. */
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
  plugins: [vue(), sharedHead(), liveData()],
  build: {
    // Every path the app answers is a real file, because GitHub Pages serves static files only.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        roadmap: fileURLToPath(new URL("./roadmap/index.html", import.meta.url)),
      },
    },
  },
});
