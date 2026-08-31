<script setup>
import { getPostCategoryApi } from "@/api/postApi";
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Grid } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();

const categoryList = ref([]);
const loading = ref(true);
const loadError = ref(false);

// 调色板：按分类 id 稳定分配一个主题色，用于分类图标底色
const palette = [
  "#cc785c",
  "#5db872",
  "#5db8a6",
  "#e8a55a",
  "#8a7bd8",
  "#d4a017",
  "#5aa3e8",
  "#c64545",
  "#7a9e5d",
  "#b070c8",
  "#4a9a8f",
  "#d97a4a",
];

const colorFor = (category) => {
  const id = Number(category.id);
  const n = Number.isFinite(id)
    ? Math.abs(id)
    : String(category.id)
        .split("")
        .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[n % palette.length];
};

const firstChar = (name) => (name ? name.charAt(0) : "?");

// 「全部」在首页时即为当前视图，高亮展示
const isAllActive = computed(() => route.path === "/home");

const getCategoryList = async () => {
  loading.value = true;
  loadError.value = false;
  try {
    const res = await getPostCategoryApi();
    categoryList.value = res.data.data || [];
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
};

const goAll = () => {
  if (route.path === "/home") return;
  router.push("/home");
};

const goCategory = (category) => {
  router.push({
    path: `/category/${category.id}`,
    query: { category: category.name },
  });
};

onMounted(getCategoryList);
</script>

<template>
  <div class="category">
    <div class="category-header">
      <span class="category-title">分类</span>
      <span
        v-if="!loading && !loadError && categoryList.length"
        class="category-count"
      >
        {{ categoryList.length }}
      </span>
    </div>

    <!-- 加载骨架 -->
    <div v-if="loading" class="category-grid">
      <div v-for="i in 6" :key="i" class="chip-skeleton"></div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="loadError" class="category-error">
      <span>分类加载失败</span>
      <el-button text type="primary" size="small" @click="getCategoryList">
        重试
      </el-button>
    </div>

    <!-- 分类列表 -->
    <div v-else class="category-grid">
      <div
        class="chip chip-all"
        :class="{ active: isAllActive }"
        @click="goAll"
      >
        <span class="chip-icon icon-all">
          <el-icon><Grid /></el-icon>
        </span>
        <span class="chip-name">全部</span>
      </div>

      <div
        v-for="category in categoryList"
        :key="category.id"
        class="chip"
        :style="{ '--cat-color': colorFor(category) }"
        @click="goCategory(category)"
      >
        <span class="chip-icon">{{ firstChar(category.name) }}</span>
        <span class="chip-name">{{ category.name }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.category {
  margin-bottom: 20px;

  .category-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 2px 14px;

    .category-title {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text-ink);
      padding-left: 12px;
      border-left: 3.5px solid var(--el-color-primary);
    }

    .category-count {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      font-weight: 500;
    }
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-base);
    overflow: hidden;
    user-select: none;
    box-shadow: var(--shadow-xs);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
      border-color: var(--cat-color, var(--el-color-primary));
    }

    &:active {
      transform: translateY(0);
    }

    .chip-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      background: var(--cat-color, var(--el-color-primary));
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }

    .chip-name {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-body);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &.chip-all {
      .icon-all {
        background: var(--el-color-primary);
      }

      &.active {
        background: var(--gradient-primary);
        border-color: transparent;
        box-shadow: var(--glow-primary);

        .icon-all {
          background: rgba(255, 255, 255, 0.25);
        }

        .chip-name {
          color: #fff;
          font-weight: 600;
        }
      }
    }
  }

  .chip-skeleton {
    height: 42px;
    border-radius: var(--radius-lg);
    background: linear-gradient(
      90deg,
      var(--bg-subtle) 25%,
      var(--bg-muted) 37%,
      var(--bg-subtle) 63%
    );
    background-size: 400% 100%;
    animation: skeleton-loading 1.4s ease infinite;
  }

  .category-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 13px;
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-lg);
  }
}

@media (max-width: 768px) {
  .category {
    margin-bottom: 12px;

    .category-header {
      padding: 0 2px 8px;

      .category-title {
        font-size: 15px;
      }
    }

    .category-grid {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 6px;
      margin: 0 -4px;
      padding-left: 4px;
      padding-right: 4px;
      gap: 8px;

      &::-webkit-scrollbar {
        height: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--border-default);
        border-radius: var(--radius-full);
      }
    }

    .chip {
      flex-shrink: 0;
      scroll-snap-align: start;
      padding: 6px 12px;
      border-radius: var(--radius-full);

      .chip-icon {
        width: 20px;
        height: 20px;
        font-size: 11px;
      }

      .chip-name {
        font-size: 13px;
      }
    }

    .chip-skeleton {
      width: 90px;
      flex-shrink: 0;
      height: 34px;
      border-radius: var(--radius-full);
    }
  }
}
</style>
