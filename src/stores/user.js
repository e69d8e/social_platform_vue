import { ref } from "vue";
import { defineStore } from "pinia";
export const useUserStore = defineStore(
  "social-platform-user",
  () => {
    const userInfo = ref({
      id: 0,
      username: "",
      avatar: "",
      bio: "",
      gender: 0,
      authorityId: 1,
      createTime: "",
      nickname: "",
      followPrivate: false,
      fansPrivate: false,
      count: 0,
    });
    const setInfo = (newUserInfo) => {
      userInfo.value = newUserInfo;
    };
    const removeInfo = () => {
      userInfo.value = {
        id: 0,
        username: "",
        avatar: "",
        bio: "",
        gender: 0,
        authorityId: 1,
        createTime: "",
        nickname: "",
      };
    };
    const token = ref({
      accessToken: "",
      refreshToken: "",
    });
    const setToken = (newToken) => {
      token.value = newToken;
    };
    const removeToken = () => {
      token.value = {
        accessToken: "",
        refreshToken: "",
      };
    };
    return { userInfo, setInfo, removeInfo, token, setToken, removeToken };
  },
  {
    persist: true,
  },
);
