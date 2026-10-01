<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { getConversationsApi } from "@/api/messageApi";
import { ArrowLeft, ChatDotRound, Loading } from "@element-plus/icons-vue";
import { debounce } from "lodash-es";
import formatRelativeTime from "@/utils/formatTime";

const router = useRouter();
const conversations = ref([]);
const loading = ref(false);
const firstLoading = ref(true);
const loadError = ref(false);
const finished = ref(false);
const pageNum = ref(1);
const pageSize = 20;

const fetchConversations = async () => {
  if (loading.value || finished.value) return;
  loading.value = true;
  loadError.value = false;
  try {
    const res = await getConversationsApi({
      pageNum: pageNum.value,
      pageSize,
    });
    if (res.data.code === 1) {
      const list = res.data.data || [];
      conversations.value.push(...list);
      if (list.length < pageSize) {
        finished.value = true;
      } else {
        pageNum.value++;
      }
    } else {
      loadError.value = true;
    }
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
    firstLoading.value = false;
  }
};

const retry = () => {
  fetchConversations();
};

// 站内历史为空时兜底回首页，避免返回键“无反应/退出站点”
const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/home");
  }
};

const onScroll = debounce(() => {
  const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    fetchConversations();
  }
}, 200);

onMounted(() => {
  fetchConversations();
  window.addEventListener("scroll", onScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  onScroll.cancel();
});

const openChat = (item) => {
  router.push({
    path: "/chat/" + item.conversationId,
    query: { receiverId: item.otherUserId },
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  return formatRelativeTime(timeStr);
};
</script>

<template>
  <div class="conversations-page">
    <!-- 顶部栏 -->
    <div class="page-header">
      <div class="header-inner">
        <button
          class="back"
          type="button"
          aria-label="返回上一页"
          @click="goBack"
        >
          <el-icon size="18"><ArrowLeft /></el-icon>
        </button>
        <div class="header-title">
          <el-icon :size="20"><ChatDotRound /></el-icon>
          <h2>私信</h2>
        </div>
      </div>
    </div>

    <!-- 首屏骨架 -->
    <div v-if="firstLoading" class="conv-skeleton" aria-busy="true">
      <div v-for="n in 6" :key="n" class="skeleton-row">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton skeleton-line w40"></div>
          <div class="skeleton skeleton-line w70"></div>
        </div>
      </div>
    </div>

    <!-- 首屏加载失败 -->
    <div v-else-if="loadError && conversations.length === 0" class="empty-wrap">
      <div class="empty-card">
        <div class="empty-icon">
          <el-icon :size="56"><ChatDotRound /></el-icon>
        </div>
        <h3>私信加载失败</h3>
        <p>检查网络后重试</p>
        <el-button type="primary" round class="retry-btn" @click="retry"
          >重新加载</el-button
        >
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && conversations.length === 0" class="empty-wrap">
      <div class="empty-card">
        <div class="empty-icon">
          <el-icon :size="56"><ChatDotRound /></el-icon>
        </div>
        <h3>暂无私信</h3>
        <p>去其他用户的主页发条私信吧</p>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="conversation-list">
      <div
        v-for="item in conversations"
        :key="item.conversationId"
        class="conversation-item"
        @click="openChat(item)"
      >
        <div class="avatar-wrap">
          <el-avatar :src="item.otherUserAvatar" :size="50" />
        </div>
        <div class="conversation-info">
          <div class="conversation-top">
            <span class="conversation-name">{{ item.otherUserNickname }}</span>
            <span class="conversation-time">{{
              formatTime(item.lastMessageTime)
            }}</span>
          </div>
          <div class="conversation-bottom">
            <span class="conversation-last">{{ item.lastMessage }}</span>
            <el-badge
              v-if="item.unreadCount > 0"
              :value="item.unreadCount"
              :max="99"
              class="unread-badge"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态 -->
    <div v-if="loading" class="loading-more">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    <div v-if="finished && conversations.length > 0" class="no-more">
      已经到底了
    </div>
  </div>
</template>

<style lang="scss" scoped>
.conversations-page {
  max-width: 640px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-page);
}

/* ---- 顶部栏 ---- */
.page-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--glass-border, var(--border-light));
  box-shadow: var(--shadow-xs);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
}

.back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-primary);
  transition: all $transition-base;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-subtle);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-primary);

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }
}

/* ---- 空状态 ---- */
.empty-wrap {
  padding: 80px 24px 40px;
}

.empty-card {
  text-align: center;

  .retry-btn {
    margin-top: 20px;
  }

  .empty-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    margin-bottom: 20px;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    color: var(--text-placeholder);
    margin: 0;
  }
}

/* ---- 首屏骨架 ---- */
.conv-skeleton {
  padding: 16px 0;

  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }

  .skeleton-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .skeleton-line {
    height: 13px;

    &.w40 {
      width: 40%;
    }

    &.w70 {
      width: 70%;
    }
  }
}

/* ---- 会话列表 ---- */
.conversation-list {
  padding: 6px 0;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all $transition-base;
  position: relative;

  &:hover {
    background: var(--bg-card);
    box-shadow: var(--shadow-sm);
  }

  &:active {
    background: var(--bg-subtle);
  }
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.conversation-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conversation-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  font-size: 12px;
  color: var(--text-placeholder);
  flex-shrink: 0;
}

.conversation-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conversation-last {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* ---- 底部状态 ---- */
.loading-more,
.no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  font-size: 13px;
  color: var(--text-placeholder);
}
</style>
