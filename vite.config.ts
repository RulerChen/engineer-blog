import type { ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { type Plugin, defineConfig } from "vite";
import { blogEntries, buildArticles, buildRoadmaps, readIcons } from "./scripts/buildEntries.js";
import { DATA_DIR, readEntries, readRoadmaps } from "./scripts/readEntries.js";

const ICON_DIR = fileURLToPath(new URL("./public/icons/", import.meta.url));

/**
 * Dev only: build the corpus and roadmap files on every request straight out of data/,
 * and reload the page whenever one of those files changes. Without it the app
 * keeps serving whatever `predev` wrote at startup, so an edit to data/ is
 * invisible until the next `npm run dev`.
 */
function liveArticles(): Plugin {
  return {
    name: "live-articles",
    apply: "serve",
    configureServer(server) {
      type File = "articles" | "roadmaps";
      const serve = async (res: ServerResponse, which: File): Promise<void> => {
        const icons = await readIcons(ICON_DIR);
        const all = buildArticles(await readEntries(), icons);
        const body =
          which === "roadmaps" ? buildRoadmaps(await readRoadmaps(), all, icons) : blogEntries(all);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
      };

      server.middlewares.use((req, res, next) => {
        const match = /(^|\/)(articles|roadmaps)\.json(\?|$)/.exec(req.url ?? "");
        if (!match) return next();
        // A half-typed JSON file is the normal case here, not a crash.
        serve(res, match[2] as File).catch((error: unknown) => {
          res.statusCode = 500;
          res.end(String(error));
        });
      });

      const reload = (file: string): void => {
        if (!file.startsWith(DATA_DIR) || !file.endsWith(".json")) return;
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
  plugins: [vue(), liveArticles()],
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
