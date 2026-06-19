import request from "@/utils/request";

export const loginApi = (username, password) => {
  return request.post("/user/login", { username, password });
};

export const registerApi = (data) => {
  return request.post("/user/register", data);
};

export const getUserInfoApi = () => {
  return request.get("/user/profile");
};

export const logoutApi = () => {
  return request.post("/user/logout");
};

// 根据id获取其他用户信息
export const getUserInfoByIdApi = (id) => {
  return request.get(`/user/profile/${id}`);
};

// 修改用户信息
export const updateUserInfoApi = (data) => {
  return request.put("/user/profile", data);
};

// 修改密码
export const updatePasswordApi = (password) => {
  return request.put("/user/password", { password });
};

// 签到
export const signInApi = () => {
  return request.post("/user/sign");
};

// 获取签到天数
export const getSignInDaysApi = () => {
  return request.get("/user/sign");
};

// 分页查询帖子
export const getPostsApi = (params) => {
  return request.get("/user/list/post", { params });
};

// 分页查询用户
export const searchUsersApi = (params) => {
  return request.get("/user/list/user", { params });
};
