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
