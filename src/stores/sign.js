import { ref } from "vue";
import { defineStore } from "pinia";
export const useSignStore = defineStore(
  "social-platform-sign",
  () => {
    const signDay = ref(0);
    const setSignDay = async (newUserInfo) => {
      signDay.value = newUserInfo;
    };
    const sign = async () => {
      signDay.value++;
    };
    const removeSignDay = async () => {
      signDay.value = 0;
    };
    return { signDay, setSignDay, removeSignDay, sign };
  },
  {
    persist: true,
  },
);
