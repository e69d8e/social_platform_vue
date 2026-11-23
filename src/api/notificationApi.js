import request from "@/utils/request";

// 获取未读通知数
export const getUnreadNotificationCountApi = () => {
  return request.get("/notification/unread-count");
};

// 分页获取通知列表
export const getNotificationsApi = (params) => {
  return request.get("/notification/list", { params });
};

// 标记单条已读
export const markNotificationReadApi = (id) => {
  return request.put(`/notification/${id}/read`);
};

// 全部标记已读
export const markAllNotificationsReadApi = () => {
  return request.put("/notification/read-all");
};
