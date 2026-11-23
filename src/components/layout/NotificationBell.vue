<template>
  <el-popover
    placement="bottom-end"
    :width="380"
    trigger="click"
    popper-class="notification-popover"
    @show="onShow"
  >
    <template #reference>
      <button
        type="button"
        class="notification-bell-btn"
        aria-label="打开通知"
        aria-haspopup="dialog"
      >
        <el-badge
          :value="unreadCount > 99 ? '99+' : unreadCount"
          :hidden="unreadCount === 0"
          :max="99"
          class="notification-badge"
        >
          <el-icon :size="20" class="bell-icon">
            <Bell />
          </el-icon>
        </el-badge>
      </button>
    </template>

    <div class="notification-panel">
      <div class="panel-header">
        <span class="panel-title">通知</span>
        <el-button
          v-if="unreadCount > 0"
          link
          type="primary"
          size="small"
          @click="handleMarkAllRead"
        >
          全部已读
        </el-button>
      </div>

      <div v-if="loading" class="panel-loading">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="notifications.length === 0" class="panel-empty">
        <el-empty description="暂无通知" :image-size="60" />
      </div>

      <div v-else class="panel-list">
        <button
          v-for="item in notifications"
          :key="item.id"
          type="button"
          class="notification-item"
          :class="{ unread: !item.isRead }"
          @click="handleClick(item)"
        >
          <el-avatar :size="36" :src="item.actorAvatar" class="item-avatar">
            {{ item.actorNickname?.charAt(0) || "系" }}
          </el-avatar>
          <div class="item-body">
            <div class="item-text">
              <template v-if="item.type === 'like'">
                <strong>{{ item.actorNickname }}</strong> 赞了你的帖子
              </template>
              <template v-else-if="item.type === 'comment'">
                <strong>{{ item.actorNickname }}</strong> 评论了你的帖子
              </template>
              <template v-else-if="item.type === 'reply'">
                <strong>{{ item.actorNickname }}</strong> 回复了你的评论
              </template>
              <template v-else-if="item.type === 'follow'">
                <strong>{{ item.actorNickname }}</strong> 关注了你
              </template>
              <template v-else>
                {{ item.content || "系统通知" }}
              </template>
            </div>
            <div v-if="item.postTitle" class="item-post-title">
              {{ item.postTitle }}
            </div>
            <div
              v-if="item.content && item.type !== 'system'"
              class="item-snippet"
            >
              {{ item.content }}
            </div>
            <div class="item-time">{{ formatTime(item.createTime) }}</div>
          </div>
          <div v-if="!item.isRead" class="unread-dot" />
        </button>
      </div>

      <div v-if="notifications.length > 0" class="panel-footer">
        <el-button link type="primary" size="small" @click="goToNotifications">
          查看全部
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Bell } from "@element-plus/icons-vue";
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "@/api/notificationApi";
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import { formatRelativeTime } from "@/utils/formatTime";

const router = useRouter();
const { unreadCount } = useUnreadNotifications();

const notifications = ref([]);
const loading = ref(false);

const onShow = async () => {
  loading.value = true;
  try {
    const res = await getNotificationsApi({ pageNum: 1, pageSize: 10 });
    if (res.data.code === 1) {
      notifications.value = res.data.data || [];
    }
  } finally {
    loading.value = false;
  }
};

const handleClick = async (item) => {
  if (!item.isRead) {
    await markNotificationReadApi(item.id);
    item.isRead = true;
    window.dispatchEvent(new Event("notification-unread-changed"));
  }
  if (item.postId) {
    router.push(`/post/${item.postId}`);
  } else if (item.actorId) {
    router.push(`/user/${item.actorId}`);
  }
};

const handleMarkAllRead = async () => {
  await markAllNotificationsReadApi();
  notifications.value.forEach((n) => (n.isRead = true));
  window.dispatchEvent(new Event("notification-unread-changed"));
};

const goToNotifications = () => {
  router.push("/notifications");
};

const formatTime = (time) => formatRelativeTime(time);
</script>

<style lang="scss" scoped>
.notification-bell-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  color: inherit;
  transition: background-color 0.2s;

  &:hover {
    background: var(--fill-light);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.notification-badge {
  display: flex;
  align-items: center;

  .bell-icon {
    color: var(--el-text-color-primary);
    transition: color 0.2s;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.notification-panel {
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .panel-title {
      font-weight: 600;
      font-size: 15px;
    }
  }

  .panel-loading {
    padding: 12px 0;
  }

  .panel-empty {
    padding: 16px 0;
  }

  .panel-list {
    max-height: 360px;
    overflow-y: auto;
  }

  .notification-item {
    width: 100%;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 4px;
    cursor: pointer;
    border-radius: 6px;
    position: relative;
    transition: background-color 0.15s;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.unread {
      background-color: var(--el-color-primary-light-9);

      &:hover {
        background-color: var(--el-color-primary-light-8);
      }
    }

    .item-avatar {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .item-body {
      flex: 1;
      min-width: 0;

      .item-text {
        font-size: 13px;
        line-height: 1.4;
        color: var(--el-text-color-primary);
      }

      .item-post-title {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-snippet {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-time {
        font-size: 11px;
        color: var(--el-text-color-placeholder);
        margin-top: 4px;
      }
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--el-color-danger);
      flex-shrink: 0;
      margin-top: 6px;
    }
  }

  .panel-footer {
    text-align: center;
    padding-top: 8px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
