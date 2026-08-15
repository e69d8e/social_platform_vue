import request from "@/utils/request";

// 上传用户头像
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return request.post("/upload/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// 上传帖子图片
export const uploadPostImgApi = (file, id) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("postId", id);
  return request.post("/upload/post", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// 删除帖子图片（静默清理，失败时不弹出错误提示）
export const deletePostImgApi = (id) => {
  return request.delete(`/upload/delete/${id}`, { silent: true });
};
