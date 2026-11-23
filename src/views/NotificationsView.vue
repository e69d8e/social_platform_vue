<template>
  <div class="notifications-page">
    <PageHeader title="互动通知" />

    <div class="notifications-toolbar">
      <el-radio-group v-model="filter" size="small" @change="onFilterChange">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="like">点赞</el-radio-button>
        <el-radio-button value="comment">评论</el-radio-button>
        <el-radio-button value="follow">关注</el-radio-button>
        <el-radio-button value="system">系统</el-radio-button>
      </el-radio-group>
      <el-button
        v-if="hasUnread"
        link
        type="primary"
        size="small"
        @click="handleMarkAllRead"
      >
        全部已读
      </el-button>
    </div>

    <div v-if="loading && items.length === 0" class="loading-wrap">
      <el-skeleton :rows="5" animated />
    </div>

    <el-empty v-else-if="isError" description="通知加载失败">
      <el-button type="primary" @click="fetchData(true)">重新加载</el-button>
    </el-empty>

    <el-empty
      v-else-if="items.length === 0"
      :description="filter ? '暂无该类型通知' : '暂无通知'"
    />

    <div v-else class="notification-list">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="notification-card"
        :class="{ unread: !item.isRead }"
        @click="handleClick(item)"
      >
        <el-avatar :size="44" :src="item.actorAvatar">
          {{ item.actorNickname?.charAt(0) || "系" }}
        </el-avatar>
        <div class="card-body">
          <div class="card-text">
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
          <div v-if="item.postTitle" class="card-post-title">
            <el-icon><Document /></el-icon> {{ item.postTitle }}
          </div>
          <div
            v-if="item.content && item.type !== 'system'"
            class="card-snippet"
          >
            {{ item.content }}
          </div>
          <div class="card-time">{{ formatTime(item.createTime) }}</div>
        </div>
        <div v-if="!item.isRead" class="unread-dot" />
      </button>
    </div>

    <div v-if="total > items.length" class="load-more">
      <el-button :loading="loading" @click="loadMore"> 加载更多 </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import PageHeader from "@/components/PageHeader.vue";
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "@/api/notificationApi";
import { formatRelativeTime } from "@/utils/formatTime";

const router = useRouter();
const notifyUnreadChanged = () =>
  window.dispatchEvent(new Event("notification-unread-changed"));

const items = ref([]);
const loading = ref(false);
const isError = ref(false);
const pageNum = ref(1);
const pageSize = 20;
const total = ref(0);
const filter = ref("");

const hasUnread = computed(() => items.value.some((n) => !n.isRead));

const fetchData = async (reset = false) => {
  if (reset) {
    pageNum.value = 1;
    items.value = [];
  }
  loading.value = true;
  isError.value = false;
  try {
    const res = await getNotificationsApi({
      pageNum: pageNum.value,
      pageSize,
      type: filter.value || undefined,
    });
    if (res.data.code === 1) {
      const data = res.data.data || [];
      if (reset) {
        items.value = data;
      } else {
        const known = new Set(items.value.map((n) => String(n.id)));
        items.value.push(...data.filter((n) => !known.has(String(n.id))));
      }
      total.value = Number(res.data.total || 0);
    } else {
      isError.value = true;
    }
  } catch {
    isError.value = true;
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
  if (loading.value || items.value.length >= total.value) return;
  pageNum.value++;
  fetchData();
};

const onFilterChange = () => {
  fetchData(true);
};

const handleClick = async (item) => {
  if (!item.isRead) {
    await markNotificationReadApi(item.id);
    item.isRead = true;
    notifyUnreadChanged();
  }
  if (item.postId) {
    router.push(`/post/${item.postId}`);
  } else if (item.actorId) {
    router.push(`/user/${item.actorId}`);
  }
};

const handleMarkAllRead = async () => {
  await markAllNotificationsReadApi();
  items.value.forEach((n) => (n.isRead = true));
  notifyUnreadChanged();
};

const formatTime = (time) => formatRelativeTime(time);

onMounted(() => fetchData(true));
</script>

<style lang="scss" scoped>
.notifications-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
}

.notifications-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.loading-wrap {
  padding: 20px 0;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  position: relative;
  transition: all 0.15s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  &.unread {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
  }

  .card-body {
    flex: 1;
    min-width: 0;

    .card-text {
      font-size: 14px;
      line-height: 1.5;
    }

    .card-post-title {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-top: 4px;
    }

    .card-snippet {
      font-size: 13px;
      color: var(--el-text-color-regular);
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .card-time {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      margin-top: 6px;
    }
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--el-color-danger);
    flex-shrink: 0;
    margin-top: 8px;
  }
}

.load-more {
  text-align: center;
  padding: 16px 0;
}
</style>
