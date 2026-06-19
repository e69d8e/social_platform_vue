import { useUserStore } from "@/stores/user";
import { router } from "@/main.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function refreshToken() {
  const userStore = useUserStore();
  const token = userStore.token?.refreshToken;
  if (!token) throw new Error("No refresh token");

  const res = await fetch(`${BASE_URL}/user/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken: token }),
  });

  const data = await res.json();
  if (data.code !== 1) throw new Error("刷新令牌失败");

  const { accessToken, refreshToken: newRefreshToken } = data.data;
  userStore.setToken({ accessToken, refreshToken: newRefreshToken });
  return accessToken;
}

function redirectLogin() {
  const userStore = useUserStore();
  userStore.removeToken();
  userStore.removeInfo();
  router.push("/login");
}

/**
 * 带 401 自动刷新的 fetch 封装（用于 SSE 流式请求等无法使用 axios 的场景）
 */
export async function authFetch(url, options, retry = true) {
  const userStore = useUserStore();
  if (!options.headers) options.headers = {};
  options.headers.authorization = `Bearer ${userStore.token.accessToken}`;

  const response = await fetch(url, options);

  if (response.status === 401 && retry) {
    try {
      const newToken = await refreshToken();
      options.headers.authorization = `Bearer ${newToken}`;
      return authFetch(url, options, false);
    } catch {
      redirectLogin();
      throw new Error("Unauthorized");
    }
  }

  return response;
}
