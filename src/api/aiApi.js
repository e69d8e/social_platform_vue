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
