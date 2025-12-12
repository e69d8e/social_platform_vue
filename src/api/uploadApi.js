import request from "@/utils/request";
// 上传用户头像
export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await request.post("/upload/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res;
};

// 上传帖子图片
export const uploadPostImg = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await request.post("/upload/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res;
};
