import request from "@/utils/request";
// 封禁用户
export const banUserApi = async (id) => {
  const res = await request.put("/admin/ban/" + id);
  return res;
};

// 封禁帖子

// 将用户设为 审核
export const setReviewerApi = async (id) => {
  const res = await request.put("/admin/review/" + id);
  return res;
};

// 将用户设为普通用户
export const setUserApi = async (id) => {
  const res = await request.put("/admin/user/" + id);
  return res;
};

// 查询封禁用户
export const getBanUsersApi = async (params) => {
  const res = await request.get("/admin/ban", {
    params,
  });
  return res;
};

// 搜索封禁用户
export const searchBanUsersApi = async (params) => {
  const res = await request.get("/admin/ban/search", {
    params,
  });
  return res;
};

// 数据面板
export const getDashboardApi = async (params) => {
  const res = await request.get("/admin/dashboard", {
    params,
  });
  return res;
};
