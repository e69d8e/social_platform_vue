import request from "@/utils/request";

// 用户创作统计
export const getProfileStatsApi = (userId) => {
  return request.get(`/user/stats/profile/${userId}`);
};

// 签到热力图
export const getSignCalendarApi = (userId) => {
  return request.get(`/user/stats/sign-calendar/${userId}`);
};

// 记录主页访问
export const recordVisitApi = (userId) => {
  return request.post(`/user/stats/visit/${userId}`);
};

// 最近访客
export const getRecentVisitorsApi = (userId, limit = 10) => {
  return request.get(`/user/stats/visitors/${userId}?limit=${limit}`);
};

// 置顶/取消置顶帖子
export const toggleTopPostApi = (postId) => {
  return request.put(`/user/stats/top-post/${postId}`);
};

// 信用分
export const getCreditScoreApi = () => {
  return request.get("/user/credit");
};
