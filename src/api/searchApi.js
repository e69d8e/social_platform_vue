import request from "@/utils/request";

// params
// {
//     "search": "哈",
//     "category": 2,
//     "pageNum": 1,
//     "pageSize": 10
// }
export function searchPostsApi(params) {
  return request.get("/user/list/post", {
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
