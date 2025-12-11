import { ref } from "vue";
import { defineStore } from "pinia";
export const useUserStore = defineStore(
  "social-platform-user",
  () => {
    const userInfo = ref({
      username: "",
      avatar: "",
      bio: "",
      gender: 0,
      authority: "",
      createTime: "",
      nickname: "",
    });
    const setInfo = async (newUserInfo) => {
      userInfo.value = newUserInfo;
    };
    const removeInfo = async () => {
      userInfo.value = {
        username: "",
        avatar: "",
        bio: "",
        gender: 0,
        authority: "",
        createTime: "",
        nickname: "",
      };
    };
    return { userInfo, setInfo, removeInfo };
  },
  {
    persist: true,
  },
);
