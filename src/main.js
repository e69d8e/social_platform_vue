import "./styles/global.scss";
import "element-plus/theme-chalk/dark/css-vars.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import { useThemeStore } from "./stores/theme";

const app = createApp(App);
const pinia = createPinia().use(piniaPluginPersistedstate);
app.use(pinia);
app.use(router);

// Initialize theme store so dark mode applies on ALL routes (not just layout pages)
const themeStore = useThemeStore();
document.documentElement.classList.toggle("dark", themeStore.isDark);
app.use(ElementPlus, {
  locale: zhCn,
});
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount("#app");

export { router };
