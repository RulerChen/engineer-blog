import { createApp } from "vue";
import App from "./App.vue";
import { warmTooltips } from "./app/tooltips.js";
import "./styles/base.css";
import "./styles/header.css";
import "./styles/blog.css";
import "./styles/tooltip.css";
import "./styles/palette.css";
import "./styles/roadmap.css";

createApp(App).mount("#app");
warmTooltips();
