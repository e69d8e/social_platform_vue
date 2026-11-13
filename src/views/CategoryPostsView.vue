<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { searchPostsApi } from "@/api/searchApi";
import {
  getCategoryDetailApi,
  getCategoryTagsApi,
  getPostCategoryApi,
} from "@/api/postApi";
import { usePageList } from "@/composables/usePageList";
import { POST_PAGE_SIZE } from "@/constants/pagination";
import PostCard from "@/components/PostCard.vue";
import CategoryComponent from "@/components/CategoryComponent.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import LoadStatus from "@/components/LoadStatus.vue";

const route = useRoute();
const router = useRouter();

const categoryDetail = ref(null);
const categoryTags = ref([]);
const selectedTagId = ref(null);

const pageTitle = computed(
  () => categoryDetail.value?.name || route.query.category || "分类专栏",
);

const categoryColor = computed(
  () => categoryDetail.value?.color || "var(--el-color-primary)",
);

const categoryIcon = computed(
  () => categoryDetail.value?.icon?.trim() || pageTitle.value.charAt(0) || "分",
);

const resolveCategoryContext = async (id) => {
  if (!id) return;
  categoryDetail.value = null;
  categoryTags.value = [];

  try {
    const [detailRes, tagsRes] = await Promise.all([
      getCategoryDetailApi(id).catch(() => null),
      getCategoryTagsApi(id, { limit: 18 }).catch(() => null),
    ]);
    if (detailRes?.data?.code === 1 && detailRes.data.data) {
      categoryDetail.value = detailRes.data.data;
    } else {
      const listRes = await getPostCategoryApi().catch(() => null);
      const hit = (listRes?.data?.data || []).find(
        (c) => String(c.id) === String(id),
      );
      if (hit) categoryDetail.value = hit;
    }
    if (tagsRes?.data?.code === 1 && Array.isArray(tagsRes.data.data)) {
      categoryTags.value = tagsRes.data.data;
    } else if (Array.isArray(categoryDetail.value?.hotTags)) {
      categoryTags.value = categoryDetail.value.hotTags;
    }
  } catch {
    categoryDetail.value = null;
  }
};

const {
  list: postList,
  pageNum,
  pageSize,
  total,
  loading,
  isError,
  pageChange,
  reset,
  retry,
} = usePageList({
  pageSize: POST_PAGE_SIZE,
  fetchPage: ({ pageNum, pageSize }) =>
    searchPostsApi({
      pageNum,
      pageSize,
      categoryId: route.params.id,
      tagId: selectedTagId.value || undefined,
    }).then((res) => ({
      data: res.data.data,
      total: Number(res.data.total ?? 0),
    })),
});

const selectTagFilter = (tagId) => {
  const next =
    tagId && String(selectedTagId.value) === String(tagId) ? null : tagId;
  if (next === selectedTagId.value) return;
  selectedTagId.value = next;
  router.replace({
    query: {
      ...route.query,
      tagId: next || undefined,
    },
  });
  reset();
};

// 同路由换分类参数时重置筛选与分页，并拉取分类详情与热门标签
watch(
  () => route.params.id,
  (newId) => {
    const queryTagId = route.query.tagId ? Number(route.query.tagId) : null;
    selectedTagId.value = Number.isFinite(queryTagId) ? queryTagId : null;
    resolveCategoryContext(newId);
    reset();
  },
  { immediate: true },
);
</script>

<template>
  <div class="list-page" v-loading="loading && postList.length > 0">
    <PageHeader :title="pageTitle" :total="total" unit="篇" />

    <!-- 分类专栏名片 -->
    <div class="category-banner" :style="{ '--cat-accent': categoryColor }">
      <div class="banner-icon">{{ categoryIcon }}</div>
      <div class="banner-info">
        <div class="banner-title-row">
          <h2 class="banner-title">{{ pageTitle }}</h2>
          <span
            v-if="categoryDetail?.postCount !== undefined"
            class="banner-count"
          >
            {{ categoryDetail.postCount }} 篇内容
          </span>
        </div>
        <p class="banner-desc">
          {{
            categoryDetail?.description ||
            "探索该领域下的精选创作、心得与社区讨论"
          }}
        </p>
      </div>
    </div>

    <!-- 分类快捷切换 -->
    <CategoryComponent :show-header="false" compact />

    <!-- 分类内热门标签筛选 -->
    <div v-if="categoryTags.length" class="tag-filter-bar">
      <span class="filter-label">标签筛选</span>
      <button
        type="button"
        class="tag-filter-pill"
        :class="{ active: !selectedTagId }"
        @click="selectTagFilter(null)"
      >
        全部
      </button>
      <button
        v-for="tag in categoryTags"
        :key="tag.id"
        type="button"
        class="tag-filter-pill"
        :class="{ active: String(selectedTagId) === String(tag.id) }"
        @click="selectTagFilter(tag.id)"
      >
        #{{ tag.name }}
        <span v-if="tag.useCount" class="pill-count">{{ tag.useCount }}</span>
      </button>
    </div>

    <SkeletonGrid
      v-if="loading && postList.length === 0"
      :count="POST_PAGE_SIZE"
    />

    <LoadStatus
      v-else-if="isError"
      :is-error="true"
      :has-items="false"
      @retry="retry"
    />

    <el-empty
      v-else-if="postList.length === 0"
      :description="selectedTagId ? '该标签下暂无匹配帖子' : '该分类暂无帖子'"
    >
      <el-button
        v-if="selectedTagId"
        type="primary"
        round
        @click="selectTagFilter(null)"
      >
        清除标签筛选
      </el-button>
      <el-button v-else type="primary" round @click="$router.push('/home')"
        >回首页看看其他分类</el-button
      >
    </el-empty>

    <CardGrid v-else :items="postList">
      <template #item="{ item, index }">
        <PostCard :post="item" :delay="index < 12 ? index * 40 : 0" />
      </template>
    </CardGrid>

    <ListPagination
      v-model:page-num="pageNum"
      :total="total"
      :page-size="pageSize"
      @change="pageChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;
}

.category-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 14px;
  border-radius: var(--radius-lg);
  background: color-mix(
    in srgb,
    var(--cat-accent, var(--el-color-primary)) 8%,
    var(--bg-card)
  );
  border: 1px solid
    color-mix(
      in srgb,
      var(--cat-accent, var(--el-color-primary)) 25%,
      var(--border-light)
    );
  box-shadow: var(--shadow-xs);

  .banner-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--cat-accent, var(--el-color-primary));
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  .banner-info {
    min-width: 0;
    flex: 1;
  }

  .banner-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .banner-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-ink);
  }

  .banner-count {
    font-size: 12px;
    padding: 2px 9px;
    border-radius: var(--radius-full);
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border-light);
    font-variant-numeric: tabular-nums;
  }

  .banner-desc {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.5;
  }
}

.tag-filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 2px 16px;

  .filter-label {
    font-size: 12.5px;
    color: var(--text-muted);
    margin-right: 4px;
  }

  .tag-filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 11px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
    background: var(--bg-card);
    color: var(--text-secondary);
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--el-color-primary-light-7);
      color: var(--el-color-primary);
    }

    &.active {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
      font-weight: 600;
    }

    .pill-count {
      font-size: 11px;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
