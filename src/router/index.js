import { createRouter, createWebHistory } from "vue-router";
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
          path: "/postList/:id",
          name: "postList",
          component: () => import("@/views/PostListView.vue"),
        },
        {
          path: "/followPosts",
          name: "MyFollowPostsView",
          component: () => import("@/views/MyFollowPostsView.vue"),
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
  ],
});

export default router;
