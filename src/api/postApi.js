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
export const publicPostApi = async (data) => {
  const res = await request.post("/post", data);
  return res;
};

// 获取帖子分类
export const getPostCategoryApi = async () => {
  const res = await request.get("/category");
  return res;
};

// 根据用户id获取帖子
export const getPostListApi = async (id, params) => {
  const res = await request.get("/post/user/" + id, {
    params,
  });
  return res;
};

// 点赞
export const likeApi = async (id) => {
  const res = await request.put("/like/" + id);
  return res;
};

// 获取帖子详情
export const getPostDetailApi = async (id) => {
  const res = await request.get("/post/" + id);
  return res;
};

// 我关注的帖子
export const getFollowPostsApi = async (params) => {
  const res = await request.get("/post/follow/list", {
    params,
  });
  return res;
};

// 删除帖子
export const deletePostApi = async (id) => {
  const res = await request.delete("/post/" + id);
  return res;
};
