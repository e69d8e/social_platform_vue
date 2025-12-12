import request from "@/utils/request";
// 首页帖子
export const getIndexPostsApi = async (params) => {
  const res = await request.get("/post/list", {
    params,
  });
  return res;
};

// 发帖
// {
//     "title": "好啊",
//     "content": "666",
//     "categoryId": 1,
//     "images": [
//         "http://127.0.0.1:8080/imgs/post/5/4/52827fe6-6a45-4a71-bd21-5bfe5d35d7ae.png"
//     ]
// }
export const postApi = async (data) => {
  const res = await request.post("/post", data);
  return res;
};
