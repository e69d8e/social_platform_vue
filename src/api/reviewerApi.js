import request from "@/utils/request";
// 封禁帖子
export const banPostApi = async (id) => {
  const res = await request.put("/reviewer/post/" + id);
  return res;
};

// 查询封禁的帖子
export const getBanPostsApi = async (params) => {
  const res = await request.get("/reviewer/post/ban", {
    params,
  });
  return res;
};

// 删除评论
export const deleteCommentApi = async (postId, id) => {
  const res = await request.delete("/reviewer/comment/" + postId + "/" + id);
  return res;
};
