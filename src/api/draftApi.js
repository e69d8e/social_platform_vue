import request from "@/utils/request";

// 获取草稿列表
export const getDraftsApi = (pageNum = 1, pageSize = 20) => {
  return request.get(
    `/post/draft/list?pageNum=${pageNum}&pageSize=${pageSize}`,
  );
};

// 立即发布草稿
export const publishDraftApi = (id) => {
  return request.put(`/post/draft/${id}/publish`);
};

// 删除草稿
export const deleteDraftApi = (id) => {
  return request.delete(`/post/draft/${id}`);
};
