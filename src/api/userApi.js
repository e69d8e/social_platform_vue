import request from "@/utils/request";
export const loginApi = (username, password) => {
  return request({
    url: "/user/login?username=" + username + "&password=" + password,
    method: "POST",
  });
};

export const registerApi = (data) => {
  return request({
    url: "/user/register",
    method: "POST",
    data,
  });
};

export const getUserInfoApi = () => {
  return request({
    url: "/user/profile",
    method: "GET",
  });
};

export const layoutApi = () => {
  return request({
    url: "/user/logout",
    method: "post",
  });
};

// 根据id获取其他用户信息
export const getUserInfoByIdApi = (id) => {
  return request({
    url: "/user/profile/" + id,
    method: "GET",
  });
};

// 修改用户信息
export const updateUserInfoApi = (data) => {
  return request({
    url: "/user/profile",
    method: "PUT",
    data,
  });
};

// 修改密码
export const updatePasswordApi = ({ password }) => {
  return request({
    url: "/user/password",
    method: "PUT",
    data: { password },
  });
};

// 签到
export const signInApi = () => {
  return request({
    url: "/user/sign",
    method: "POST",
  });
};

// 分页查询帖子
export const getPostsApi = (data) => {
  return request({
    url: "user/list/post",
    method: "GET",
    data,
  });
};

// 分页查询用户
export const searchUsersApi = (params) => {
  return request.get("user/list/user", {
    params,
  });
};
