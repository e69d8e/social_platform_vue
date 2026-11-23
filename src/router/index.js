import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";
import LayoutView from "@/views/LayoutView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: LayoutView,
      redirect: "/home",
      children: [
        {
          path: "/home",
          name: "home",
          component: () => import("@/views/HomeView.vue"),
        },
        {
          path: "/search",
          name: "search",
          component: () => import("@/views/SearchView.vue"),
        },
        {
          path: "/follow/:id",
          name: "follow",
          component: () => import("@/views/FollowListView.vue"),
        },
        {
          path: "/fans/:id",
          name: "fans",
          component: () => import("@/views/FansListView.vue"),
        },
        {
          path: "/user/:id",
          name: "user",
          component: () => import("@/views/UserView.vue"),
        },
        {
          path: "/friends",
          name: "friend",
          component: () => import("@/views/FriendListView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/postList/:id",
          name: "postList",
          component: () => import("@/views/PostListView.vue"),
        },
        {
          path: "/followPosts",
          name: "MyFollowPostsView",
          component: () => import("@/views/MyFollowPostsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/favorites",
          name: "favorites",
          component: () => import("@/views/FavoritesView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/blacklist",
          name: "blacklist",
          component: () => import("@/views/BlacklistView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/notifications",
          name: "notifications",
          component: () => import("@/views/NotificationsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/drafts",
          name: "drafts",
          component: () => import("@/views/DraftsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/featured",
          name: "featured",
          component: () => import("@/views/FeaturedView.vue"),
        },
        {
          path: "/category/:id",
          name: "category",
          component: () => import("@/views/CategoryPostsView.vue"),
        },
        {
          path: "/my",
          name: "my",
          component: () => import("@/views/MyView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/publicPost",
          name: "publicPost",
          component: () => import("@/views/PublicPostView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/conversations",
          name: "conversations",
          component: () => import("@/views/ConversationsView.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/:pathMatch(.*)*",
          name: "notFound",
          component: () => import("@/views/NotFoundView.vue"),
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/post/:id",
      name: "post",
      component: () => import("@/views/PostView.vue"),
    },
    {
      path: "/posts/banned",
      name: "bannedPosts",
      component: () => import("@/views/BanPostListView.vue"),
      meta: { requiresAuth: true, roles: [2, 3] },
    },
    {
      path: "/users/banned",
      name: "bannedUsers",
      component: () => import("@/views/BanUserListView.vue"),
      meta: { requiresAuth: true, roles: [2] },
    },
    {
      path: "/admin/dashboard",
      name: "adminDashboard",
      component: () => import("@/views/AdminDashboardView.vue"),
      meta: { requiresAuth: true, roles: [2] },
    },
    {
      path: "/aiChat",
      name: "AIChat",
      component: () => import("@/views/AIChatView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/userAgreement",
      name: "userAgreement",
      component: () => import("@/views/UserAgreementView.vue"),
    },
    {
      path: "/chat/:conversationId",
      name: "chat",
      component: () => import("@/views/ChatView.vue"),
      meta: { requiresAuth: true },
    },
  ],
  // 浏览器前进/后退恢复滚动位置；站内新跳转回到顶部
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

const PAGE_TITLES = {
  home: "首页",
  search: "搜索",
  follow: "关注",
  fans: "粉丝",
  user: "个人主页",
  friend: "好友",
  postList: "帖子",
  MyFollowPostsView: "关注动态",
  favorites: "收藏",
  blacklist: "黑名单",
  notifications: "互动通知",
  drafts: "草稿箱",
  featured: "每周精选",
  category: "专栏",
  my: "个人中心",
  publicPost: "发布帖子",
  post: "帖子详情",
  bannedPosts: "违规帖子",
  bannedUsers: "违规用户",
  adminDashboard: "数据与运营后台",
  AIChat: "AI 助手",
  userAgreement: "用户协议",
  conversations: "私信",
  chat: "聊天",
  login: "登录",
  notFound: "页面不存在",
};

router.afterEach((to) => {
  const title = PAGE_TITLES[to.name];
  document.title = title ? `${title} - Y社区` : "Y社区";
});

// 路由守卫：校验页面访问权限与角色权限
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  const isLoggedIn = userStore.isLoggedIn;

  // 0. 已登录用户访问登录页：直接回到目标页/首页，避免重复登录
  if (to.name === "login" && isLoggedIn) {
    const redirect = to.query.redirect;
    next(redirect ? decodeURIComponent(String(redirect)) : "/home");
    return;
  }

  // 1. 未登录拦截：需要登录的页面直接重定向到 /login
  if (to.meta.requiresAuth && !isLoggedIn) {
    ElMessage.info("请先登录后访问该页面");
    next({ path: "/login", query: { redirect: to.fullPath } });
    return;
  }

  // 2. 角色权限拦截：管理员/审核员等
  const requiredRoles = to.meta.roles;
  if (requiredRoles) {
    const userRole = userStore.userInfo?.authorityId;
    if (!requiredRoles.includes(userRole)) {
      ElMessage.error("无权访问该页面");
      // 回退而非硬跳首页：用户在深链场景下也能留在原路径上下文
      if (from.name) next(false);
      else next("/home");
      return;
    }
  }

  next();
});

export default router;
