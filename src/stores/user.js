import { ref, computed } from "vue";
import { defineStore } from "pinia";

// 登出/未登录时的空白资料：与 setInfo 写入的服务端字段保持同构
const DEFAULT_USER_INFO = {
  id: 0,
  username: "",
  avatar: "",
  backgroundUrl: "",
  bio: "",
  gender: 0,
  authorityId: 1,
  authority: "",
  createTime: "",
  nickname: "",
  followPrivate: false,
  fansPrivate: false,
  count: 0,
  fansCount: 0,
};

export const useUserStore = defineStore(
  "social-platform-user",
  () => {
    const userInfo = ref({ ...DEFAULT_USER_INFO });
    const setInfo = (newUserInfo) => {
      userInfo.value = newUserInfo;
    };
    const removeInfo = () => {
      userInfo.value = { ...DEFAULT_USER_INFO };
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

    // 登录态以 accessToken 为准（接口鉴权真正依赖的凭据）：
    // 只刷新过页面、资料还没拉回来时也算「已登录」，避免守卫误踢。
    const isLoggedIn = computed(
      () =>
        Boolean(token.value.accessToken) || Boolean(userInfo.value.username),
    );

    /** 一次性清除登录态（登出 / 令牌失效时使用，避免只清一半） */
    const clearSession = () => {
      removeToken();
      removeInfo();
    };
    // 审核员(3)/管理员(2)可执行内容管理操作；兼容 authorityId 与 authority 两种表示
    const isModerator = computed(
      () =>
        [2, 3].includes(userInfo.value.authorityId) ||
        ["REVIEWER", "ADMIN"].includes(userInfo.value.authority),
    );
    const isAdmin = computed(
      () =>
        userInfo.value.authorityId === 2 ||
        userInfo.value.authority === "ADMIN",
    );

    return {
      userInfo,
      setInfo,
      removeInfo,
      token,
      setToken,
      removeToken,
      clearSession,
      isLoggedIn,
      isModerator,
      isAdmin,
    };
  },
  {
    persist: true,
  },
);
