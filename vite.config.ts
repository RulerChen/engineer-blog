import type { ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { type Plugin, defineConfig } from "vite";
import { buildArticles, readIcons } from "./scripts/buildEntries.js";
import { DATA_DIR, readEntries } from "./scripts/readEntries.js";

const ICON_DIR = fileURLToPath(new URL("./public/icons/", import.meta.url));

/**
 * Dev only: build articles.json on every request straight out of data/, and
 * reload the page whenever one of those files changes. Without it the app keeps
 * serving the public/articles.json that `predev` wrote at startup, so an edit to
 * data/ is invisible until the next `npm run dev`.
 */
function liveArticles(): Plugin {
  return {
    name: "live-articles",
    apply: "serve",
    configureServer(server) {
      const serve = async (res: ServerResponse): Promise<void> => {
        const articles = buildArticles(await readEntries(), await readIcons(ICON_DIR));
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(articles));
      };

      server.middlewares.use((req, res, next) => {
        if (!/(^|\/)articles\.json(\?|$)/.test(req.url ?? "")) return next();
        // A half-typed JSON file is the normal case here, not a crash.
        serve(res).catch((error: unknown) => {
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
});
