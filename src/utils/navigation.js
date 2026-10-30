/**
 * 路由跳转桥接层。
 *
 * 背景：axios 拦截器 / fetch 封装（utils 层）需要跳转路由，但直接
 * `import { router } from "@/main.js"` 会形成
 *   main.js -> router/index.js -> views -> api -> utils/request.js -> main.js
 * 的循环依赖：模块初始化顺序一旦变化（例如测试环境、SSR、HMR 全量重载），
 * `router` 可能还是 undefined，导致「登录失效不跳转」这类隐性故障。
 *
 * 因此这里只保留一个可注入的跳转函数，由 App 启动时（main.js）注册；
 * utils 层调用 navigateTo() 时不需要知道 router 的存在。
 */

let navigateImpl = null;

/**
 * 注册真实跳转实现（只应由 main.js 调用一次）
 * @param {(target: import("vue-router").RouteLocationRaw) => unknown} fn
 */
export function registerNavigator(fn) {
  navigateImpl = fn;
}

/**
 * 安全跳转：未注册（极早期阶段）时降级为浏览器地址跳转，避免静默失败。
 * @param {import("vue-router").RouteLocationRaw} target
 */
export function navigateTo(target) {
  if (navigateImpl) {
    return navigateImpl(target);
  }
  if (typeof target === "string" && typeof window !== "undefined") {
    window.location.assign(target);
  }
  return undefined;
}

/**
 * 游客可自由浏览的路径（公开页面）。
 * 用于「登录态失效」时判断是否该打断当前浏览：公开页只清理本地态，不跳转。
 * 新增公开路由时请同步维护此处与 router 的 requiresAuth 标记。
 * @param {string} path
 */
export function isPublicPath(path) {
  const p = path || "/";
  const exact = ["/", "/home", "/search", "/login", "/userAgreement"];
  if (exact.includes(p)) return true;
  return [
    "/post/",
    "/category/",
    "/user/",
    "/postList/",
    "/follow/",
    "/fans/",
  ].some((prefix) => p.startsWith(prefix));
}

/** 登录页地址（携带当前地址，登录后原路返回） */
export function loginLocation(redirect) {
  const fullPath =
    redirect ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");
  return { path: "/login", query: { redirect: fullPath } };
}
