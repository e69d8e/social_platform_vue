import axios from "axios";
import { router } from "@/main.js";
import { useUserStore } from "@/stores/user";

// 创建axios实例
const request = axios.create({
  baseURL: "http://127.0.0.1:8080/api",
  timeout: 10000,
  withCredentials: true, // 允许携带cookie
});
// 添加请求拦截器
request.interceptors.request.use(
  function (config) {
    const userStore = useUserStore();
    // 在发送请求之前做些什么
    config.headers.Authorization = "Bearer " + userStore.token.accessToken;
    return config;
  },
  function (error) {
    // 对请求错误做些什么
    return Promise.reject(error);
  },
);
// 刷新令牌函数
async function refreshToken() {
  const userStore = useUserStore();
  const refreshToken = userStore.token.refreshToken;
  if (!refreshToken) {
    throw new Error("No refresh token");
  }
  const response = await axios.post("http://127.0.0.1:8080/api/user/refresh", {
    refreshToken,
  });
  if (response.data.code !== 1) {
    throw new Error("刷新令牌失败");
  }
  const { accessToken, refreshToken: newRefreshToken } = response.data.data;
  userStore.setToken({
    accessToken,
    refreshToken: newRefreshToken,
  });
  return accessToken;
}

// 全局变量，防止并发刷新
let isRefreshing = false;
let failedQueue = [];

function processQueue(err, token = null) {
  failedQueue.forEach((promise) => {
    if (err) {
      promise.reject(err);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

// 添加响应拦截器
request.interceptors.response.use(
  function (response) {
    // 2xx 范围内的状态码都会触发该函数。
    // 对响应数据做点什么
    if (response.data.code !== 1) {
      // eslint-disable-next-line no-undef
      ElMessage.error(response.data.message);
      return;
    }
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    if (error.response?.status === 500) {
      console.log(error.response.data.message);
      // eslint-disable-next-line no-undef
      ElMessage.error(error.response.data.message);
    }
    // 判断是否是 401 且尚未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 正在刷新中，将请求加入队列
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
        const newAccessToken = await refreshToken();
        // 更新当前请求的 Authorization 头
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        // 处理队列中的请求
        processQueue(null, newAccessToken);
        return request(originalRequest);
      } catch (refreshError) {
        // 刷新失败，清除本地令牌并跳转登录
        const userStore = useUserStore();
        userStore.removeToken();
        userStore.removeInfo();
        processQueue(refreshError, null);
        // 跳转登录页
        router.push("/login");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
export default request;
export const baseURL = "http://127.0.0.1:8080/api";
export const logoUrl = "http://127.0.0.1:8080/imgs/logo.png";
