import request from "@/utils/request";

// 评论
export const addCommentApi = (data) => {
  return request.post("/comment", { ...data });
};

// 获取评论
export const getCommentApi = (id, params) => {
  return request.get(`/comment/${id}`, { params });
};
