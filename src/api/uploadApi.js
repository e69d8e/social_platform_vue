import request from "@/utils/request";

// 上传用户头像
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return request.post("/upload/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // 图片上传远慢于普通接口，沿用 10s 默认超时会导致大图上传被判超时
    timeout: 60000,
  });
};

// 上传个人主页背景图
export const uploadBackground = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return request.post("/upload/background", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
};

// 上传帖子图片
export const uploadPostImgApi = (file, id) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("postId", id);
  return request.post("/upload/post", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
};

// 删除帖子图片（静默清理，失败时不弹出错误提示）
export const deletePostImgApi = (id) => {
  return request.delete(`/upload/delete/${id}`, { silent: true });
};

// 秒传预检：按 SHA-256 查询服务端是否已有相同内容，命中时后端直接补登复用记录并返回已有 URL，
// 前端可跳过整个文件传输；未命中（data 为 null）时走正常上传
export const checkFileHashApi = (hash, postId) => {
  return request.get("/upload/check", {
    params: { hash, postId: postId || undefined },
    silent: true,
  });
};
