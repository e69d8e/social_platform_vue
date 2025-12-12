import request from "@/utils/request";
// 获取用户关注列表
export const getFollowListApi = async (params) => {
  const res = await request.get("/follow/followee", {
    params,
  });
  return res;
};

// 获取用户粉丝列表
export const getFollowerListApi = async (params) => {
  const res = await request.get("/follow/list", {
    params,
  });
  return res;
};

export const followUserApi = async (id) => {
  const res = await request.post("/follow/" + id);
  return res;
};

export const unfollowUserApi = async (id) => {
  const res = await request.delete("/follow/" + id);
  return res;
};
