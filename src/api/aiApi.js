import request from "@/utils/request";

// 获取会话列表
export const getSessionApi = async (pageNum, pageSize) => {
  const res = await request.get(
    `/session/all?page=${pageNum}&size=${pageSize}`,
  );
  return res;
};

// 获取会话id
export const createSessionApi = async () => {
  const res = await request.get("/session");
  return res;
};

// 删除会话
export const deleteSessionApi = async (id) => {
  const res = await request.delete("/session/" + id);
  return res;
};

// 获取会话内容
export const getSessionContentApi = async (id) => {
  const res = await request.get("/session/" + id);
  return res;
};
