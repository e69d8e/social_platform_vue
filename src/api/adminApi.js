import request from "@/utils/request";

// 封禁用户
export const banUserApi = (id) => {
  return request.put(`/admin/ban/${id}`);
};

// 将用户设为审核员
export const setReviewerApi = (id) => {
  return request.put(`/admin/review/${id}`);
};

// 将用户设为普通用户
export const setUserApi = (id) => {
  return request.put(`/admin/user/${id}`);
};

// 查询封禁用户
export const getBanUsersApi = (params) => {
  return request.get("/admin/ban", { params });
};

// 搜索封禁用户
export const searchBanUsersApi = (params) => {
  return request.get("/admin/ban/search", { params });
};

// 数据面板
export const getDashboardApi = (params) => {
  return request.get("/admin/dashboard", { params });
};
