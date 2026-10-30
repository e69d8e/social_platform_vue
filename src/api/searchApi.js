import request from "@/utils/request";

// 帖子搜索
// params: { keyword, categoryId?, pageNum, pageSize, record? }
// record=false 用于顶栏实时联想：联想请求不应污染搜索历史
export function searchPostsApi(params) {
  return request.get("/user/list/post", {
    params,
  });
}

// 用户搜索
// params: { keyword, pageNum, pageSize, record? }
export function searchUsersApi(params) {
  return request.get("/user/list/user", {
    params,
  });
}

export function getSearchHistoryApi(params) {
  return request.get("/user/search-history", { params });
}

export function deleteSearchHistoryApi(id) {
  return request.delete(`/user/search-history/${id}`);
}

export function clearSearchHistoryApi() {
  return request.delete("/user/search-history");
}
