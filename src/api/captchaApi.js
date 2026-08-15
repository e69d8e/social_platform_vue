import request from "@/utils/request";

// 获取滑块验证码：返回 { captchaId, offset }
export const getSlideCaptchaApi = () => {
  return request.get("/captcha/slide");
};

// 服务端校验滑块：返回一次性 { verifyToken }
export const verifySlideCaptchaApi = (captchaId, left, timestamp) => {
  return request.post("/captcha/slide/verify", { captchaId, left, timestamp });
};
