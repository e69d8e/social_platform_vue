import { ref, watch } from "vue";
import { defineStore } from "pinia";

const getSystemPreference = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

const applyDarkClass = (isDark) => {
  document.documentElement.classList.toggle("dark", isDark);
};

export const useThemeStore = defineStore(
  "social-platform-theme",
  () => {
    const isDark = ref(getSystemPreference());

    applyDarkClass(isDark.value);

    const toggle = () => {
      isDark.value = !isDark.value;
    };

    watch(isDark, applyDarkClass);

    return { isDark, toggle };
  },
  {
    persist: true,
  },
);
