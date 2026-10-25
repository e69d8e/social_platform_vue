<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Search, Close, Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useUserStore } from "@/stores/user";
import { useSearchHistory } from "@/composables/useSearchHistory";
import { HEADER_HISTORY_PAGE_SIZE } from "@/constants/pagination";

const router = useRouter();
const userStore = useUserStore();

const searchContent = ref("");
const historyVisible = ref(false);
const mobileSearchVisible = ref(false);

// 搜索历史：拉取/删除/清空逻辑收敛于 useSearchHistory
const {
  historyList,
  historyLoading,
  fetchHistory,
  deleteHistory,
  clearHistory,
} = useSearchHistory({ pageSize: HEADER_HISTORY_PAGE_SIZE });

const onSearchFocus = () => {
  if (!userStore.isLoggedIn) return;
  fetchHistory();
  historyVisible.value = true;
};

const onSearchBlur = () => {
  setTimeout(() => {
    historyVisible.value = false;
  }, 200);
};

// 移动端搜索弹窗打开时补拉一次历史（桌面端靠 focus 触发）
watch(mobileSearchVisible, (visible) => {
  if (visible && userStore.isLoggedIn) fetchHistory();
});

const historySearch = (item) => {
  historyVisible.value = false;
  mobileSearchVisible.value = false;
  searchContent.value = "";
  router.push({
    path: "/search",
    query: { keyword: item.keyword, type: item.type },
  });
};

const handleSearchSubmit = () => {
  const kw = searchContent.value.trim();
  if (!kw) {
    ElMessage.warning("请输入搜索内容");
    return;
  }
  historyVisible.value = false;
  mobileSearchVisible.value = false;
  router.push({
    path: "/search",
    query: { keyword: kw },
  });
  searchContent.value = "";
};
</script>

<template>
  <!-- 桌面端搜索区（>992px 显示） -->
  <div class="header-center">
    <div class="search-wrapper">
      <div class="search-row">
        <el-input
          v-model="searchContent"
          placeholder="搜索帖子或用户"
          :prefix-icon="Search"
          @keyup.enter="handleSearchSubmit"
          @focus="onSearchFocus"
          @blur="onSearchBlur"
          class="search-input"
          clearable
        />
        <el-button
          :icon="Search"
          @click="handleSearchSubmit"
          class="search-btn"
        />
      </div>
      <transition name="dropdown">
        <div
          v-show="historyVisible"
          class="search-dropdown"
          v-loading="historyLoading"
        >
          <template v-if="historyList.length">
            <div class="dropdown-header">
              <span>搜索历史</span>
              <el-button
                size="small"
                text
                type="danger"
                @click="clearHistory"
              >
                <el-icon><Delete /></el-icon>
                清空
              </el-button>
            </div>
            <div
              v-for="item in historyList"
              :key="item.id"
              class="dropdown-item"
              @mousedown.prevent="historySearch(item)"
            >
              <span class="item-keyword">{{ item.keyword }}</span>
              <span class="item-type">{{
                item.type === 0 ? "帖子" : "用户"
              }}</span>
              <el-icon
                class="item-close"
                @mousedown.stop="deleteHistory(item.id)"
                ><Close
              /></el-icon>
            </div>
          </template>
          <div v-else class="dropdown-empty">
            暂无搜索历史，输入关键词开始探索
          </div>
        </div>
      </transition>
    </div>
  </div>

  <!-- 移动端快捷搜索按钮 (<992px 显示) -->
  <button
    class="mobile-tool-btn header-search-btn-mobile"
    title="搜索"
    type="button"
    @click="mobileSearchVisible = true"
  >
    <el-icon :size="16"><Search /></el-icon>
  </button>

  <!-- 移动端搜索弹窗 -->
  <el-dialog
    v-model="mobileSearchVisible"
    title="搜索"
    width="min(500px, 92vw)"
    align-center
  >
    <div class="mobile-search-body">
      <el-input
        v-model="searchContent"
        placeholder="搜索帖子或用户"
        :prefix-icon="Search"
        clearable
        size="large"
        @keyup.enter="handleSearchSubmit"
      >
        <template #append>
          <el-button :icon="Search" @click="handleSearchSubmit"
            >搜索</el-button
          >
        </template>
      </el-input>

      <div v-if="historyList.length" class="mobile-history">
        <div class="mobile-history-head">
          <span>搜索历史</span>
          <el-button
            size="small"
            text
            type="danger"
            @click="clearHistory"
            >清空</el-button
          >
        </div>
        <div class="mobile-history-tags">
          <span
            v-for="item in historyList"
            :key="item.id"
            class="mobile-tag"
            @click="historySearch(item)"
          >
            {{ item.keyword }}
          </span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
  padding: 0 12px;
}

.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 380px;
  min-width: 140px;
}

.search-row {
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;

  :deep(.el-input__wrapper) {
    border-radius: var(--radius-full);
    padding: 4px 14px;
    background: var(--bg-card);
    box-shadow: 0 0 0 1px var(--border-default) inset;
    transition: all var(--transition-base);

    &:hover {
      box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
    }

    &:focus-within {
      box-shadow:
        0 0 0 2px var(--el-color-primary) inset,
        var(--glow-primary);
    }
  }
}

.search-btn {
  margin-left: 6px;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--gradient-primary);
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    transform: scale(1.06);
    box-shadow: var(--glow-primary);
  }
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--glass-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-default);
  z-index: 200;
  padding: 8px 0;
  max-height: 320px;
  overflow-y: auto;

  .dropdown-empty {
    padding: 18px 16px;
    font-size: 13px;
    color: var(--text-placeholder);
    text-align: center;
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 14px 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 4px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover {
      background: var(--bg-subtle);
    }

    .item-keyword {
      flex: 1;
      font-size: 13.5px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-type {
      font-size: 11px;
      color: var(--text-placeholder);
      flex-shrink: 0;
    }

    .item-close {
      font-size: 12px;
      color: var(--text-placeholder);
      flex-shrink: 0;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--el-color-danger);
      }
    }
  }
}

// 移动端快捷搜索按钮：桌面隐藏，<992px 顶栏搜索区让位后显示
.mobile-tool-btn.header-search-btn-mobile {
  display: none;
}

.mobile-tool-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-base);

  &:hover,
  &.active {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-7);
    background: var(--el-color-primary-light-9);
  }
}

// 移动端搜索弹窗样式
.mobile-search-body {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .mobile-history {
    .mobile-history-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .mobile-history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .mobile-tag {
      padding: 5px 12px;
      font-size: 13px;
      color: var(--text-secondary);
      background: var(--bg-subtle);
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all var(--transition-base);

      &:hover,
      &:active {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
    }
  }
}

@media (max-width: 1280px) {
  .search-wrapper {
    max-width: 280px;
  }
}

@media (max-width: 1100px) {
  .search-wrapper {
    max-width: 220px;
  }
}

@media (max-width: 992px) {
  .header-center {
    display: none;
  }

  .mobile-tool-btn.header-search-btn-mobile {
    display: inline-flex;
  }
}

@media (max-width: 640px) {
  .mobile-tool-btn {
    width: 30px;
    height: 30px;
  }
}
</style>
