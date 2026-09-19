import type { ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { type Plugin, defineConfig } from "vite";
import { buildArticles, readIcons, splitCorpora } from "./scripts/buildEntries.js";
import { DATA_DIR, readEntries } from "./scripts/readEntries.js";

const ICON_DIR = fileURLToPath(new URL("./public/icons/", import.meta.url));

/**
 * Dev only: build the two corpus files on every request straight out of data/,
 * and reload the page whenever one of those files changes. Without it the app
 * keeps serving whatever `predev` wrote at startup, so an edit to data/ is
 * invisible until the next `npm run dev`.
 */
function liveArticles(): Plugin {
  return {
    name: "live-articles",
    apply: "serve",
    configureServer(server) {
      const serve = async (res: ServerResponse, which: "articles" | "papers"): Promise<void> => {
        const corpora = splitCorpora(buildArticles(await readEntries(), await readIcons(ICON_DIR)));
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(corpora[which]));
      };

      server.middlewares.use((req, res, next) => {
        const match = /(^|\/)(articles|papers)\.json(\?|$)/.exec(req.url ?? "");
        if (!match) return next();
        // A half-typed JSON file is the normal case here, not a crash.
        serve(res, match[2] as "articles" | "papers").catch((error: unknown) => {
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
    // One app, but two entry documents that both boot it. Switching lists is
    // state, so no navigation happens in the browser — what these buy is the
    // cold load: GitHub Pages serves static files, so /paper/ has to be a file
    // that exists. A 404.html fallback would answer with a 404 status, which is
    // the wrong thing to hand a crawler for a page that is really there.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        paper: fileURLToPath(new URL("./paper/index.html", import.meta.url)),
      },
    },
  },
});
