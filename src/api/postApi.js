import request from "@/utils/request";
// 首页帖子
export const getIndexPostsApi = async (params) => {
  const res = await request.get("/post/list", {
    params,
  });
  return res;
};
