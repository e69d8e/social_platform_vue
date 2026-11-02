import request from "@/utils/request";

// 拉黑用户（幂等）。拉黑后双方互不可见内容、互不可私信，并自动解除关注关系
export const blockUserApi = (userId) => {
  return request.post(`/blacklist/${userId}`);
};

// 解除拉黑（幂等）。可见性与私信立即恢复，关注关系不会自动恢复
export const unblockUserApi = (userId) => {
  return request.delete(`/blacklist/${userId}`);
};

// 我的黑名单（按拉黑时间倒序分页）
export const getBlacklistApi = (params) => {
  return request.get("/blacklist", { params });
};
