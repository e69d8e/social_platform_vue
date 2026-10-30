<script setup>
import { ref, watch } from "vue";
import { throttle } from "lodash-es";
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { useUserStore } from "@/stores/user";
import { ElMessage } from "element-plus";
import { useRequireLogin } from "@/composables/useRequireLogin";

const props = defineProps({
  userId: { type: [String, Number], required: true },
  followed: { type: Boolean, default: false },
  size: { type: String, default: "" },
  round: { type: Boolean, default: true },
});

const emit = defineEmits(["change"]);

const userStore = useUserStore();
const requireLogin = useRequireLogin();
const followed = ref(props.followed);
const followLoading = ref(false);
const isHovered = ref(false);

// 同步外部传入的关注状态
watch(
  () => props.followed,
  (val) => {
    followed.value = val;
  },
);

// 乐观更新：先切换 UI，接口失败时回滚
// leading throttle + followLoading 双守卫：杜绝快速双击触发「关注→取关」双翻转
const toggleFollow = throttle(
  async () => {
    if (!requireLogin("请先登录后再关注")) return;
    if (String(userStore.userInfo.id) === String(props.userId)) {
      ElMessage.warning("不能关注自己");
      return;
    }
    if (followLoading.value) return;
    followLoading.value = true;
    const oldFollowed = followed.value;
    followed.value = !followed.value;
    try {
      const api = oldFollowed ? unfollowUserApi : followUserApi;
      const res = await api(props.userId);
      if (res.data.code !== 1) throw new Error(res.data.message || "操作失败");
      ElMessage.success(
        res.data.message || (followed.value ? "关注成功" : "已取消关注"),
      );
      emit("change", followed.value);
    } catch {
      // 提示已由拦截器统一给出，这里只回滚 UI 状态
      followed.value = oldFollowed;
    } finally {
      followLoading.value = false;
    }
  },
  800,
  { trailing: false },
);
</script>

<template>
  <el-button
    v-if="String(userStore.userInfo.id) !== String(userId)"
    class="follow-btn"
    :class="{
      'is-followed': followed,
      'is-unfollow-hover': followed && isHovered,
    }"
    :size="size || undefined"
    :round="round"
    :type="followed ? (isHovered ? 'danger' : 'default') : 'primary'"
    :plain="followed && isHovered"
    :loading="followLoading"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click.stop="toggleFollow"
  >
    {{ followed ? (isHovered ? "取消关注" : "已关注") : "关注" }}
  </el-button>
</template>

<style lang="scss" scoped>
.follow-btn {
  flex-shrink: 0;
  min-width: 76px;
  transition: all $transition-base;

  &.is-followed {
    color: var(--text-secondary);
    border-color: var(--border-default);
    background: var(--bg-card);

    &:hover {
      color: var(--el-color-danger);
      border-color: var(--el-color-danger-light-5);
      background: var(--el-color-danger-light-9);
    }
  }
}
</style>
