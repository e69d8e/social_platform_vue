import request from "@/utils/request";

// 发送私信
export const sendMessageApi = (data) => {
  return request.post("/message", data);
};

// 获取会话列表
export const getConversationsApi = (params) => {
  return request.get("/message/conversations", { params });
};

// 获取单个会话详情（含 canSend：任一方向拉黑即 false）
export const getConversationApi = (conversationId) => {
  return request.get(`/message/conversation/${conversationId}`);
};

// 获取消息历史
export const getMessageHistoryApi = (conversationId, params) => {
  return request.get(`/message/history/${conversationId}`, { params });
};

// 标记已读
export const markReadApi = (conversationId) => {
  return request.put(`/message/read/${conversationId}`);
};

// 获取未读消息总数
export const getUnreadCountApi = () => {
  return request.get("/message/unread");
};
