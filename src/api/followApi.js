import request from "@/utils/request";
// 获取关注列表
export const getFollowListApi = async (params) => {
  const res = await request.get("/follow/followee", {
    params,
  });
  return res;
};

// 获取粉丝列表
export const getFollowerListApi = async (params) => {
  const res = await request.get("/follow/list", {
    params,
  });
  return res;
};

// 关注用户
export const followUserApi = async (id) => {
  const res = await request.post("/follow/" + id);
  return res;
};

// 取消关注用户
export const unfollowUserApi = async (id) => {
  const res = await request.delete("/follow/" + id);
  return res;
};

// 获取用户关注列表
export const getUserFollowListApi = async (params, id) => {
  const res = await request.get("/follow/list/followee/" + id, {
    params,
  });
  return res;
};

// 获取用户粉丝列表
export const getUserFollowerListApi = async (params, id) => {
  const res = await request.get("/follow/list/" + id, {
    params,
  });
  return res;
};
