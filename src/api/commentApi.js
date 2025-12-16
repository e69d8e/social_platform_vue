import request from "@/utils/request";
// 评论
export const addCommentApi = async (data) => {
  console.log(data);
  const res = await request.post("/comment", {
    ...data,
  });
  return res;
};

// 获取评论
export const getCommentApi = async (id, params) => {
  const res = await request.get("/comment/" + id, {
    params,
  });
  return res;
};
