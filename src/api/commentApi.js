import request from "@/utils/request";

// 评论
export const addCommentApi = (data) => {
  return request.post("/comment", { ...data });
};

// 获取评论
export const getCommentApi = (id, params) => {
  return request.get(`/comment/${id}`, { params });
};

// 评论点赞/取消点赞
export const likeCommentApi = (commentId) => {
  return request.put(`/comment/like/${commentId}`);
};
