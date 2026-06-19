import request from "@/utils/request";

// 获取关注列表
export const getFollowListApi = (params) => {
  return request.get("/follow/followee", { params });
};

// 获取粉丝列表
export const getFollowerListApi = (params) => {
  return request.get("/follow/list", { params });
};

// 关注用户
export const followUserApi = (id) => {
  return request.post(`/follow/${id}`);
};

// 取消关注用户
export const unfollowUserApi = (id) => {
  return request.delete(`/follow/${id}`);
};

// 获取用户关注列表
export const getUserFollowListApi = (params, id) => {
  return request.get(`/follow/list/followee/${id}`, { params });
};

// 获取用户粉丝列表
export const getUserFollowerListApi = (params, id) => {
  return request.get(`/follow/list/${id}`, { params });
};

// 获取好友列表
export const getFriendListApi = (params) => {
  return request.get("/follow/friend", { params });
};
