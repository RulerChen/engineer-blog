// Page paths and titles, read by the app and by the build that writes one HTML file per page.

export const PAGE_TITLES = {
  blog: "Awesome Engineering Blogs",
  roadmap: "Awesome Engineering Roadmaps",
} as const;

/** Under the site base; the build copies index.html there because GitHub Pages serves real files only. */
export const ROADMAP_PATH = "roadmap/";
