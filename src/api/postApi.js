import request from "@/utils/request";

// 首页帖子
export const getIndexPostsApi = (params) => {
  return request.get("/post/list", { params });
};

// 发帖
export const publishPostApi = (data) => {
  return request.post("/post", data);
};

// 获取帖子分类
export const getPostCategoryApi = () => {
  return request.get("/category");
};

// 根据用户id获取帖子
export const getPostListApi = (id, params) => {
  return request.get(`/post/user/${id}`, { params });
};

// 点赞
export const likeApi = (id) => {
  return request.put(`/like/${id}`);
};

// 获取帖子详情
export const getPostDetailApi = (id) => {
  return request.get(`/post/${id}`);
};

// 我关注的帖子
export const getFollowPostsApi = (params) => {
  return request.get("/post/follow/list", { params });
};

// 删除帖子
export const deletePostApi = (id) => {
  return request.delete(`/post/${id}`);
};

// 获取新帖子ID
export const getPostIdApi = () => {
  return request.get("/post");
};

// 记录帖子浏览量
export const recordPostViewApi = (id) => {
  return request.post(`/post/view/${id}`);
};
