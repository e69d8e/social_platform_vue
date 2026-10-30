import { ref, computed } from "vue";
import { defineStore } from "pinia";

const todayKey = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const useSignStore = defineStore(
  "social-platform-sign",
  () => {
    /** 连续签到天数 */
    const signDay = ref(0);
    /** 今天是否已签到（持久化「签到日期」，跨零点自动失效） */
    const lastSignDate = ref("");

    const signedToday = computed(() => lastSignDate.value === todayKey());

    /**
     * 用服务端返回的签到状态同步本地（GET/POST /user/sign 均返回 { days, signedToday }）。
     * 兼容旧的纯数字返回（历史接口），避免灰度期间前端崩溃。
     */
    const applySignState = (payload) => {
      if (payload && typeof payload === "object") {
        signDay.value = Number(payload.days ?? 0) || 0;
        lastSignDate.value = payload.signedToday ? todayKey() : "";
        return;
      }
      signDay.value = Number(payload ?? 0) || 0;
      if (signDay.value > 0) lastSignDate.value = todayKey();
    };

    const markSigned = (days) => {
      signDay.value = Number(days ?? signDay.value) || 0;
      lastSignDate.value = todayKey();
    };

    const removeSignDay = () => {
      signDay.value = 0;
      lastSignDate.value = "";
    };

    return {
      signDay,
      lastSignDate,
      signedToday,
      applySignState,
      markSigned,
      removeSignDay,
    };
  },
  {
    persist: true,
  },
);
