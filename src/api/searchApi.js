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
