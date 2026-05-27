import request from "@/utils/request";

// 发送私信
export const sendMessageApi = async (data) => {
  const res = await request.post("/message", data);
  return res;
};

// 获取会话列表
export const getConversationsApi = async (params) => {
  const res = await request.get("/message/conversations", { params });
  return res;
};

// 获取消息历史
export const getMessageHistoryApi = async (conversationId, params) => {
  const res = await request.get("/message/history/" + conversationId, {
    params,
  });
  return res;
};

// 标记已读
export const markReadApi = async (conversationId) => {
  const res = await request.put("/message/read/" + conversationId);
  return res;
};

// 获取未读消息总数
export const getUnreadCountApi = async () => {
  const res = await request.get("/message/unread");
  return res;
};
