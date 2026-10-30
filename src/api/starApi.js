import request from "@/utils/request";

// 收藏/取消收藏（切换操作），返回最新收藏数
export const starApi = (postId) => {
  return request.put(`/star/${postId}`);
};

// 我的收藏列表
export const getStarListApi = (params) => {
  return request.get("/star/list", { params });
};
