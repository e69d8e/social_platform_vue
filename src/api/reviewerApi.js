import request from "@/utils/request";

// 封禁帖子
export const banPostApi = (id) => {
  return request.put(`/reviewer/post/${id}`);
};

// 查询封禁的帖子
export const getBanPostsApi = (params) => {
  return request.get("/reviewer/post/ban", { params });
};

// 搜索封禁帖子
export const searchBanPostsApi = (params) => {
  return request.get("/reviewer/post/ban/search", { params });
};

// 删除评论
export const deleteCommentApi = (postId, id) => {
  return request.delete(`/reviewer/comment/${postId}/${id}`);
};
