<template>
  <div class="drafts-page">
    <PageHeader title="草稿箱" />

    <div v-if="loading && drafts.length === 0" class="draft-skeleton">
      <el-skeleton :rows="4" animated />
    </div>

    <el-empty v-else-if="isError" description="草稿加载失败">
      <el-button type="primary" @click="fetchDrafts(true)">重新加载</el-button>
    </el-empty>

    <el-empty
      v-else-if="drafts.length === 0"
      description="暂无草稿，去写下第一篇吧"
    >
      <el-button type="primary" @click="router.push('/publicPost')"
        >去写帖子</el-button
      >
    </el-empty>

    <div v-else class="draft-list">
      <div v-for="draft in drafts" :key="draft.id" class="draft-card">
        <button
          type="button"
          class="draft-info"
          title="编辑草稿"
          @click="editDraft(draft)"
        >
          <h3 class="draft-title">{{ draft.title || "无标题" }}</h3>
          <p class="draft-snippet">{{ getSnippet(draft.content) }}</p>
          <div class="draft-meta">
            <el-tag
              :type="draft.status === 'scheduled' ? 'warning' : 'info'"
              size="small"
            >
              {{ draft.status === "scheduled" ? "定时发布" : "草稿" }}
            </el-tag>
            <span v-if="draft.publishTime" class="draft-time">
              定时: {{ formatTime(draft.publishTime) }}
            </span>
            <span class="draft-time">{{ formatTime(draft.createTime) }}</span>
          </div>
        </button>
        <div class="draft-actions">
          <el-button
            type="primary"
            size="small"
            text
            @click.stop="editDraft(draft)"
          >
            编辑
          </el-button>
          <el-button
            type="primary"
            size="small"
            :loading="publishingId === draft.id"
            @click.stop="publishDraft(draft.id)"
          >
            发布
          </el-button>
          <el-button
            type="danger"
            size="small"
            text
            @click.stop="deleteDraft(draft.id)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="!isError && total > drafts.length" class="load-more">
      <el-button :loading="loading" @click="loadMore">加载更多</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { getDraftsApi, publishDraftApi, deleteDraftApi } from "@/api/draftApi";
import { formatExactTime } from "@/utils/formatTime";

const router = useRouter();
const drafts = ref([]);
const loading = ref(false);
const isError = ref(false);
const publishingId = ref(null);
const pageNum = ref(1);
const total = ref(0);

const fetchDrafts = async (reset = false) => {
  if (reset) {
    pageNum.value = 1;
    drafts.value = [];
  }
  loading.value = true;
  isError.value = false;
  try {
    const res = await getDraftsApi(pageNum.value);
    if (res.data.code === 1) {
      const data = res.data.data || [];
      if (reset) {
        drafts.value = data;
      } else {
        const known = new Set(drafts.value.map((d) => String(d.id)));
        drafts.value.push(...data.filter((d) => !known.has(String(d.id))));
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
  if (loading.value || drafts.value.length >= total.value) return;
  pageNum.value++;
  fetchDrafts();
};

const publishDraft = async (id) => {
  try {
    await ElMessageBox.confirm(
      "发布后将进入公开推荐流，确定现在发布吗？",
      "发布草稿",
      { type: "warning", confirmButtonText: "发布" },
    );
  } catch {
    return;
  }
  publishingId.value = id;
  try {
    const res = await publishDraftApi(id);
    if (res.data.code === 1) {
      ElMessage.success("发布成功");
      drafts.value = drafts.value.filter((d) => String(d.id) !== String(id));
      total.value = Math.max(0, total.value - 1);
    }
  } catch {
    /* handled */
  } finally {
    publishingId.value = null;
  }
};

const deleteDraft = async (id) => {
  try {
    await ElMessageBox.confirm("确定删除这篇草稿吗？", "提示", {
      type: "warning",
    });
    const res = await deleteDraftApi(id);
    if (res.data.code === 1) {
      ElMessage.success("已删除");
      drafts.value = drafts.value.filter((d) => String(d.id) !== String(id));
      total.value = Math.max(0, total.value - 1);
    }
  } catch {
    /* cancelled */
  }
};

const editDraft = (draft) => {
  router.push({ path: "/publicPost", query: { draftId: draft.id } });
};

const getSnippet = (content) => {
  if (!content) return "";
  const text = content.replace(/<[^>]*>/g, "").trim();
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
};

const formatTime = (time) => formatExactTime(time);

onMounted(() => fetchDrafts(true));
</script>

<style lang="scss" scoped>
.drafts-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
}

.draft-skeleton {
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-radius: 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}

.draft-info {
  width: 100%;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  flex: 1;
  min-width: 0;

  .draft-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 6px;
  }

  .draft-snippet {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin: 0 0 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .draft-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}

.draft-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 12px;
}

.load-more {
  text-align: center;
  padding: 16px 0;
}
</style>
