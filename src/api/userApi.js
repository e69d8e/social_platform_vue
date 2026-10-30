import request from "@/utils/request";

export const loginApi = (username, password, verifyToken) => {
  return request.post("/user/login", { username, password, verifyToken });
};

export const registerApi = (data, verifyToken) => {
  return request.post("/user/register", { ...data, verifyToken });
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

// 修改密码（需携带原密码，服务端会校验操作者身份）
export const updatePasswordApi = (password, oldPassword) => {
  return request.put("/user/password", { password, oldPassword });
};

// 签到
export const signInApi = () => {
  return request.post("/user/sign");
};

// 获取签到天数
export const getSignInDaysApi = () => {
  return request.get("/user/sign");
};

// 说明：帖子/用户搜索统一走 @/api/searchApi（searchPostsApi / searchUsersApi），
// 避免同一后端接口在两处重复定义后参数不一致。
