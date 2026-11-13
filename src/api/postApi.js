import request from "@/utils/request";

// 首页帖子（支持 mode: recommend | hot | latest、refresh、seed 与游标分页）
export const getIndexPostsApi = (params) => {
  return request.get("/post/list", { params });
};

// 推荐负反馈（不感兴趣：POST / CATEGORY / TAG / AUTHOR）
export const submitRecommendFeedbackApi = (data) => {
  return request.post("/recommend/feedback", data);
};

// 撤销推荐负反馈
export const undoRecommendFeedbackApi = (params) => {
  return request.delete("/recommend/feedback", { params });
};

// 发帖
export const publishPostApi = (data) => {
  return request.post("/post", data);
};

// 获取帖子分类列表（含描述、图标、配色、贴数、热门标签）
export const getPostCategoryApi = () => {
  return request.get("/category");
};

// 获取单个分类详情
export const getCategoryDetailApi = (id) => {
  return request.get(`/category/${id}`);
};

// 获取指定分类下的热门标签
export const getCategoryTagsApi = (id, params = { limit: 15 }) => {
  return request.get(`/category/${id}/tags`, { params });
};

// 获取全站或指定分类热门标签
export const getHotTagsApi = (params = { limit: 20 }) => {
  return request.get("/tag/hot", { params });
};

// 搜索标签（发帖联想用）
export const searchTagsApi = (params) => {
  return request.get("/tag/search", { params });
};

// 按标签分页查询帖子
export const getTagPostsApi = (params) => {
  return request.get("/tag/posts", { params });
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

// 设置帖子私密状态（silent：调用方自带更贴切的行内提示，避免与拦截器重复弹窗）
export const updatePostPrivacyApi = (id, isPrivate) => {
  return request.put(`/post/privacy/${id}`, null, {
    params: { isPrivate },
    silent: true,
  });
};
