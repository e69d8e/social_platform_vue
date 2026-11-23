import request from "@/utils/request";

// 获取会话列表
export const getSessionApi = (pageNum, pageSize) => {
  return request.get(`/session/all?page=${pageNum}&size=${pageSize}`);
};

// 创建会话
export const createSessionApi = () => {
  return request.get("/session");
};

// 删除会话
export const deleteSessionApi = (id) => {
  return request.delete(`/session/${id}`);
};

// 获取会话内容
export const getSessionContentApi = (id) => {
  return request.get(`/session/${id}`);
};

// AI 生成标题
export const aiGenerateTitlesApi = (content) => {
  return request.post("/ai/content/titles", { content });
};

// AI 润色内容
export const aiPolishContentApi = (content) => {
  return request.post("/ai/content/polish", { content });
};

// AI 总结评论
export const aiSummarizeCommentsApi = (postId) => {
  return request.get(`/ai/content/summarize/${postId}`);
};
