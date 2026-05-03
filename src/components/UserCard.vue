<script setup>
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { ref, computed } from "vue";
import { throttle } from "lodash";
import { useUserStore } from "@/stores/user";
import formattedCount from "@/utils/formattedCount";
const props = defineProps({
  id: {
    type: String,
    default: "",
  },
  avatar: {
    type: String,
    default: "http://127.0.0.1:8080/imgs/avatar/default.jpg",
  },
  nickname: {
    type: String,
    default: "用户名",
  },
  bio: {
    type: String,
    default: "个性签名",
  },
  followed: {
    type: Boolean,
    default: false,
  },
  count: {
    type: Number,
    default: 0,
  },
});
const followed = ref(props.followed);
const count = ref(props.count);
const userStore = useUserStore();

const followLoading = ref(false);
const toggleFollow = throttle(async () => {
  // 不能关注自己
  if (userStore.userInfo.id === props.id) {
    // eslint-disable-next-line no-undef
    ElMessage({
      message: "不能关注自己",
      type: "warning",
    });
    return;
  }

  // 防并发
  if (followLoading.value) return;
  followLoading.value = true;

  // 记录旧状态（用于回滚）
  const oldFollowed = followed.value;

  // 乐观更新（UI先变）
  followed.value = !followed.value;

  try {
    // 根据状态调用不同接口
    const res = followed.value
      ? await followUserApi(props.id)
      : await unfollowUserApi(props.id);

    if (res.data.code !== 1) {
      throw new Error("操作失败");
    }

    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  } catch (e) {
    // 失败回滚
    followed.value = oldFollowed;
    console.log(e);

    // eslint-disable-next-line no-undef
    ElMessage({
      message: "操作失败，请重试",
      type: "error",
    });
  } finally {
    followLoading.value = false;
  }
}, 800);
const fansCount = computed(() => {
  return formattedCount(count.value);
});
</script>

<template>
  <div class="userCard">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-avatar
            class="pointer"
            @click="$router.push(`/user/${props.id}`)"
            :src="props.avatar"
          />
          <span
            @click="$router.push(`/user/${props.id}`)"
            class="nickname pointer"
            >{{ props.nickname }}</span
          >
          <el-button
            @click="toggleFollow"
            v-if="!followed"
            type="primary"
            class="follow"
            >关注</el-button
          >
          <el-button @click="toggleFollow" v-else class="follow"
            >已关注</el-button
          >
        </div>
        <el-text
          style="display: flex; justify-content: flex-start; cursor: pointer"
          @click="$router.push(`/fans/${props.id}`)"
          size="small"
          type="primary"
          >{{ fansCount }} 粉</el-text
        >
      </template>
      <div class="bio pointer" @click="$router.push(`/user/${props.id}`)">
        {{ props.bio }}
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.userCard {
  width: 100%;
  margin-bottom: 10px;
  .pointer {
    cursor: pointer;
  }
  .card-header {
    display: flex;
    align-items: center;
    line-height: 50px;
  }
  .content {
    text-align: left;
    // 限制显示一行内容
  }
  .nickname {
    text-align: left;
    white-space: 1; /* 强制文本不换行 */
    overflow: hidden; /* 隐藏溢出内容 */
    text-overflow: ellipsis; /* 显示省略号 */
    width: 50%; /* 需要指定宽度 */
    margin-left: 10px;
  }
  .bio {
    text-align: left;
    // 限制显示一行内容
    white-space: nowrap; /* 强制文本不换行 */
    overflow: hidden; /* 隐藏溢出内容 */
    text-overflow: ellipsis; /* 显示省略号 */
    width: 100%; /* 需要指定宽度 */
  }
}
@keyframes grow {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.03);
  }
}
@keyframes shrink {
  0% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
}
.userCard:hover {
  animation: grow 0.5s ease-in-out;
  animation-fill-mode: forwards; /* 保持最后状态 */
}
.userCard:not(:hover) {
  animation: shrink 0.5s ease-in-out;
  animation-fill-mode: forwards; /* 保持最后状态 */
}
</style>
