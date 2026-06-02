import axios from "axios";
import { router } from "@/main.js";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";

const BASE_URL = "http://127.0.0.1:8080/api";

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

  const { data } = await axios.post(`${BASE_URL}/user/refresh`, { refreshToken: token });
  if (data.code !== 1) throw new Error("刷新令牌失败");

  const { accessToken, refreshToken: newRefreshToken } = data.data;
  userStore.setToken({ accessToken, refreshToken: newRefreshToken });
  return accessToken;
}

function processQueue(err, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    err ? reject(err) : resolve(token);
  });
  failedQueue = [];
}

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    if (response.data.code !== 1) {
      ElMessage.error(response.data.message || "请求失败");
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403) {
      ElMessage.error("无权访问");
      router.push("/");
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
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
        const userStore = useUserStore();
        userStore.removeToken();
        userStore.removeInfo();
        processQueue(refreshError, null);
        ElMessage.error("用户未登录");
        router.push("/login");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const msg = error.response?.data?.message || error.message || "网络错误";
    ElMessage.error(msg);
    return Promise.reject(error);
  },
);

export default request;
export const baseURL = BASE_URL;
export const logoUrl = "http://127.0.0.1:8080/imgs/logo.png";
