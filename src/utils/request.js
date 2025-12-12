import axios from "axios";
import { router } from "@/main.js";
import { useUserStore } from "@/stores/user";

// 创建axios实例
const request = axios.create({
  baseURL: "http://127.0.0.1:8080/api",
  timeout: 100000,
  withCredentials: true, // 允许携带cookie
});
// 添加请求拦截器
request.interceptors.request.use(
  function (config) {
    // 在发送请求之前做些什么
    // config.headers.Authorization = "Bearer " + userStore.userInfo.token;
    return config;
  },
  function (error) {
    // 对请求错误做些什么
    return Promise.reject(error);
  },
);

// 添加响应拦截器
request.interceptors.response.use(
  function (response) {
    // 2xx 范围内的状态码都会触发该函数。
    // 对响应数据做点什么
    if (response.data.code !== 1) {
      // eslint-disable-next-line no-undef
      ElMessage.error(response.data.message);
    }
    return response;
  },
  function (error) {
    // 超出 2xx 范围的状态码都会触发该函数。
    // 对响应错误做点什么
    if (error.response.status === 401 || error.response.status == 403) {
      const userStore = useUserStore();
      userStore.removeInfo();
      // eslint-disable-next-line no-undef
      ElMessage.error("用户未授权");
      router.push("/login");
    }
    return Promise.reject(error);
  },
);
export default request;
export const baseURL = "http://127.0.0.1:8080/api";
