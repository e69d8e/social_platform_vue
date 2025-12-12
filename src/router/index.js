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
          path: "/follow",
          name: "follow",
          component: () => import("@/views/FollowListVIew.vue"),
        },
        {
          path: "/fans",
          name: "fans",
          component: () => import("@/views/FansListView.vue"),
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
  ],
});

export default router;
