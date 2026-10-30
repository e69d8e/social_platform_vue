import axios from "axios";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";
import { navigateTo, loginLocation, isPublicPath } from "@/utils/navigation";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

// 请求拦截器：附加 Authorization
request.interceptors.request.use(
  (config) => {
    const token = useUserStore().token?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 令牌刷新
let isRefreshing = false;
let failedQueue = [];

async function refreshToken() {
  const userStore = useUserStore();
  const token = userStore.token?.refreshToken;
  if (!token) throw new Error("No refresh token");

  // 带上旧 accessToken：后端会把它加入黑名单，避免刷新后旧令牌仍可用
  const accessToken = userStore.token?.accessToken;
  const { data } = await axios.post(
    `${BASE_URL}/user/refresh`,
    { refreshToken: token },
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );
  if (data.code !== 1) throw new Error(data.message || "刷新令牌失败");

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    data.data;
  userStore.setToken({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
  return newAccessToken;
}

function processQueue(err, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token);
  });
  failedQueue = [];
}

/**
 * 会话彻底失效：清理本地登录态。
 *  - 始终给出提示，否则用户点了按钮却毫无反应；
 *  - 只有「当前页本身需要登录」时才跳转登录页，游客浏览公开页不被打断。
 */
function handleSessionExpired(redirectCurrent = true, message) {
  const userStore = useUserStore();
  // 令牌与用户信息必须一起清：只清一半会出现「已登录但没有身份」的错乱态
  userStore.clearSession();

  if (message) ElMessage.error(message);
  if (!redirectCurrent) return;
  const current = window.location.pathname + window.location.search;
  navigateTo(loginLocation(current));
}

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    if (response.data?.code !== 1 && !response.config?.silent) {
      ElMessage.error(response.data?.message || "请求失败");
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    // 401：尝试刷新令牌后重放；刷新失败则清理登录态
    if (status === 401 && !originalRequest._retry) {
      // 游客（没有 refreshToken）触发需登录的操作：直接引导登录，
      // 不要走一遍注定失败的刷新流程，否则用户点了按钮会「毫无反应」
      if (!useUserStore().token?.refreshToken) {
        if (!originalRequest.silent) {
          // 用户是「主动执行了一个需要登录的操作」，直接带去登录页并记录回跳地址
          handleSessionExpired(true, "请先登录后再操作");
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return request(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // 公开页面（游客可浏览）只清理本地态并提示，不强制跳转登录页
        handleSessionExpired(
          !isPublicPath(window.location.pathname),
          "登录状态已失效，请重新登录",
        );
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403：只是「本次操作没有权限」，页面本身仍然可看，不要整页跳走
    if (status === 403) {
      if (!originalRequest.silent) {
        ElMessage.error(error.response?.data?.message || "没有权限执行该操作");
      }
      return Promise.reject(error);
    }

    if (!originalRequest.silent) {
      ElMessage.error(
        error.response?.data?.message || error.message || "网络错误",
      );
    }
    return Promise.reject(error);
  },
);

export { isPublicPath };
export default request;
export const baseURL = BASE_URL;
export const logoUrl = `${import.meta.env.VITE_BASE_URL}/imgs/logo.png`;
