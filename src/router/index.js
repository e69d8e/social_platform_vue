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
        },
        {
          path: "/category/:id",
          name: "category",
          component: () => import("@/views/CategoryPostsView.vue"),
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/my",
      name: "my",
      component: () => import("@/views/MyView.vue"),
    },
    {
      path: "/publicPost",
      name: "publicPost",
      component: () => import("@/views/PublicPostView.vue"),
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
      meta: { roles: [2, 3] },
    },
    {
      path: "/users/banned",
      name: "bannedUsers",
      component: () => import("@/views/BanUserListView.vue"),
      meta: { roles: [2] },
    },
    {
      path: "/admin/dashboard",
      name: "adminDashboard",
      component: () => import("@/views/AdminDashboardView.vue"),
      meta: { roles: [2] },
    },
    {
      path: "/aiChat",
      name: "AIChat",
      component: () => import("@/views/AIChatView.vue"),
    },
    {
      path: "/userAgreement",
      name: "userAgreement",
      component: () => import("@/views/UserAgreementView.vue"),
    },
    {
      path: "/conversations",
      name: "conversations",
      component: () => import("@/views/ConversationsView.vue"),
    },
    {
      path: "/chat/:conversationId",
      name: "chat",
      component: () => import("@/views/ChatView.vue"),
    },
  ],
});

// 路由守卫：校验页面权限
router.beforeEach((to, from, next) => {
  const requiredRoles = to.meta.roles;
  if (requiredRoles) {
    const userStore = useUserStore();
    const userRole = userStore.userInfo?.authorityId;
    if (!requiredRoles.includes(userRole)) {
      ElMessage.error("无权访问该页面");
      next("/");
      return;
    }
  }
  next();
});

export default router;
