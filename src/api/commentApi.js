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

// 删除评论（作者本人可删自己的；管理员/审核员可删任意评论）
export const deleteCommentApi = (id) => {
  return request.delete(`/comment/${id}`);
};
