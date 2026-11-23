<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  shallowRef,
  onBeforeUnmount,
} from "vue";
import { Lock, Plus, Close } from "@element-plus/icons-vue";
import {
  getPostCategoryApi,
  getCategoryTagsApi,
  getHotTagsApi,
  searchTagsApi,
  getPostIdApi,
  getPostDetailApi,
  publishPostApi,
} from "@/api/postApi";
import { deletePostImgApi, uploadPostImgApi } from "@/api/uploadApi";
import { useRouter, useRoute, onBeforeRouteLeave } from "vue-router";
import { useGoBack } from "@/composables/useGoBack";
import "@wangeditor/editor/dist/css/style.css";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import ImageCropper from "@/components/ImageCropper.vue";
import CoverUploader from "@/components/publish/CoverUploader.vue";
import compressImage from "@/utils/compressImage";
import { uploadWithDedup } from "@/utils/uploadDedup";

const router = useRouter();
const route = useRoute();
const goBack = useGoBack("/home");

// ---- Form & Editor State ----
const MAX_TAGS = 5;
const id = ref("");
const title = ref("");
const categoryId = ref("");
const selectedTags = ref([]);
const tagInput = ref("");
const tagSearchResults = ref([]);
const suggestedTags = ref([]);
const tagSearching = ref(false);
const isPrivate = ref(false);
const categoryList = ref([]);
const valueHtml = ref("");
const editorRef = shallowRef();
const loading = ref(false);
const dialogConfirmVisible = ref(false);
const isPublished = ref(false);
const isEditingDraft = ref(false);
const coverUrl = ref("");
const savingDraft = ref(false);
const aiLoading = ref(false);
const scheduleEnabled = ref(false);
const scheduleTime = ref(null);
let tagSearchTimer = null;

const selectedCategory = computed(() =>
  categoryList.value.find((c) => String(c.id) === String(categoryId.value)),
);

const pad2 = (n) => String(n).padStart(2, "0");
const toLocalDateTime = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const disabledScheduleDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
};
const validateSchedule = () => {
  if (!scheduleEnabled.value) return true;
  if (!scheduleTime.value) {
    ElMessage.warning("请选择定时发布时间");
    return false;
  }
  if (scheduleTime.value.getTime() <= Date.now()) {
    ElMessage.warning("定时发布时间必须晚于当前时间");
    return false;
  }
  return true;
};

const availableSuggestedTags = computed(() => {
  const chosen = new Set(selectedTags.value.map((t) => t.toLowerCase()));
  return suggestedTags.value.filter(
    (tag) => tag?.name && !chosen.has(tag.name.toLowerCase()),
  );
});

const categoryIconFor = (cat) =>
  cat?.icon?.trim() || (cat?.name ? cat.name.charAt(0) : "分");

const selectCategory = (cat) => {
  if (!cat) return;
  categoryId.value = String(categoryId.value) === String(cat.id) ? "" : cat.id;
};

const normalizeTagName = (raw) => {
  if (!raw) return "";
  return String(raw)
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .slice(0, 20)
    .trim();
};

const addTag = (rawName) => {
  const clean = normalizeTagName(rawName ?? tagInput.value);
  if (!clean) return;
  if (selectedTags.value.length >= MAX_TAGS) {
    ElMessage.warning(`最多可选择 ${MAX_TAGS} 个标签`);
    return;
  }
  const exists = selectedTags.value.some(
    (t) => t.toLowerCase() === clean.toLowerCase(),
  );
  if (exists) {
    tagInput.value = "";
    tagSearchResults.value = [];
    return;
  }
  selectedTags.value = [...selectedTags.value, clean];
  tagInput.value = "";
  tagSearchResults.value = [];
};

const removeTag = (index) => {
  selectedTags.value = selectedTags.value.filter((_, idx) => idx !== index);
};

const handleTagInput = () => {
  const kw = normalizeTagName(tagInput.value);
  if (tagSearchTimer) clearTimeout(tagSearchTimer);
  if (!kw) {
    tagSearchResults.value = [];
    return;
  }
  tagSearchTimer = setTimeout(async () => {
    tagSearching.value = true;
    try {
      const res = await searchTagsApi({
        keyword: kw,
        categoryId: categoryId.value || undefined,
        limit: 8,
      });
      if (res.data?.code === 1) {
        const chosen = new Set(selectedTags.value.map((t) => t.toLowerCase()));
        tagSearchResults.value = (res.data.data || []).filter(
          (t) => !chosen.has(t.name.toLowerCase()),
        );
      }
    } catch {
      tagSearchResults.value = [];
    } finally {
      tagSearching.value = false;
    }
  }, 180);
};

const loadSuggestedTags = async (catId) => {
  try {
    const res = catId
      ? await getCategoryTagsApi(catId, { limit: 12 })
      : await getHotTagsApi({ limit: 12 });
    if (res.data?.code === 1 && Array.isArray(res.data.data)) {
      suggestedTags.value = res.data.data;
    }
  } catch {
    suggestedTags.value = [];
  }
};

watch(categoryId, (val) => {
  loadSuggestedTags(val || null);
});

// ---- Cover & Upload State ----
// 封面文件由 CoverUploader 裁切压缩后回传
const coverFile = ref(null);
const hasUploadedImg = ref(false);

// ---- Rich Text Editor Image Cropper State ----
const editorCropperVisible = ref(false);
const editorCropperFile = ref(null);
let editorPendingInsertFn = null;

// ---- WangEditor Config ----
const mode = "simple";
const toolbarConfig = { excludeKeys: ["insertVideo"] };
const editorConfig = { placeholder: "请输入内容..." };

const handleCreated = (editor) => {
  editorRef.value = editor;
};

editorConfig.MENU_CONF = {};
editorConfig.MENU_CONF["uploadImage"] = {
  maxNumberOfFiles: 1,
  customUpload(uploadFile, insertFn) {
    if (!uploadFile) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        uploadFile.type,
      )
    ) {
      ElMessage.error("上传图片格式应为 jpg / png / webp / gif!");
      return;
    }
    // 拦截富文本插图上传，呼出裁切组件
    editorPendingInsertFn = insertFn;
    editorCropperFile.value = uploadFile;
    editorCropperVisible.value = true;
  },
};

const onEditorImageCropped = async (croppedFile) => {
  if (!editorPendingInsertFn) return;
  try {
    const compressed = await compressImage(croppedFile, {
      maxWidth: 1920,
      maxHeight: 1440,
      quality: 0.88,
    });
    if (compressed.size / 1024 / 1024 > 8) {
      ElMessage.error("图片压缩后仍超过 8MB，请更换图片");
      return;
    }
    // 秒传：命中哈希直接复用服务端已有 URL，跳过文件传输
    const url = await uploadWithDedup(compressed, {
      postId: id.value,
      upload: uploadPostImgApi,
    });
    if (url) {
      hasUploadedImg.value = true;
      editorPendingInsertFn(url, "图片描述", url);
      ElMessage.success("插图上传成功");
    }
  } catch {
    // 服务端/网络错误提示由拦截器统一给出，这里只做状态清理
  } finally {
    editorPendingInsertFn = null;
    editorCropperFile.value = null;
  }
};

// ---- Category & Data Fetching ----
const getCategoryList = async () => {
  const res = await getPostCategoryApi();
  categoryList.value = res.data.data;
};

// ---- Publishing & Lifecycle ----
const handleBeforeUnload = (e) => {
  if (!isPublished.value && id.value && (title.value || hasUploadedImg.value)) {
    e.preventDefault();
    e.returnValue = "";
  }
};
const cleanupResources = async () => {
  if (isPublished.value || isEditingDraft.value) return;
  if (id.value && hasUploadedImg.value) {
    try {
      await deletePostImgApi(id.value);
    } catch {
      // 清理失败不影响页面退出
    }
  }
};

const handleOpenPublishDialog = () => {
  const trimmedTitle = title.value.trim();
  if (!trimmedTitle) {
    ElMessage.warning("请输入帖子标题");
    return;
  }
  const text = editorRef.value?.getText().trim() || "";
  const hasImages = valueHtml.value.includes("<img");
  if (!text && !hasImages) {
    ElMessage.warning("请输入帖子正文内容");
    return;
  }
  if (!validateSchedule()) return;
  dialogConfirmVisible.value = true;
};

const publicPost = async () => {
  if (!validateSchedule()) return;
  let uploadedCover = null;
  loading.value = true;
  try {
    if (coverFile.value) {
      // 秒传：命中哈希直接复用服务端已有 URL，跳过文件传输
      uploadedCover = await uploadWithDedup(coverFile.value, {
        postId: id.value,
        upload: uploadPostImgApi,
      });
      if (uploadedCover) {
        coverUrl.value = uploadedCover;
        hasUploadedImg.value = true;
      }
    }
    const isScheduled = scheduleEnabled.value && scheduleTime.value;
    const res = await publishPostApi({
      id: id.value,
      cover: uploadedCover || coverUrl.value || null,
      title: title.value.trim(),
      content: valueHtml.value,
      // 未选择分类时传 null，后端默认归入“其他”分类
      categoryId: categoryId.value === "" ? null : categoryId.value,
      tags: selectedTags.value,
      isPrivate: isPrivate.value,
      publishType: isScheduled ? "schedule" : "now",
      publishTime: isScheduled ? toLocalDateTime(scheduleTime.value) : null,
    });
    // 失败时保留确认弹窗（提示已由拦截器给出），用户可以直接重试，不用重新点发布
    if (res.data.code !== 1) return;
    dialogConfirmVisible.value = false;
    ElMessage.success(res.data.message);
    isPublished.value = true;
    // 直接跳到新帖详情：router.back() 会回到进入发布页前的任意页面，
    // 用户发完帖第一件事是想确认帖子长什么样
    router.replace(`/post/${id.value}`);
  } catch {
    // 失败原因由拦截器给出（如标题/内容超长），确认弹窗保持打开可直接重试
  } finally {
    loading.value = false;
  }
};

const saveDraft = async () => {
  const text = editorRef.value?.getText().trim() || "";
  if (!title.value.trim() && !text) {
    ElMessage.warning("请先输入内容再保存草稿");
    return;
  }
  savingDraft.value = true;
  try {
    const res = await publishPostApi({
      id: id.value,
      cover: coverUrl.value || null,
      title: title.value.trim() || "无标题草稿",
      content: valueHtml.value || "<p>草稿</p>",
      categoryId: categoryId.value === "" ? null : categoryId.value,
      tags: selectedTags.value,
      isPrivate: true, // 草稿默认私密
      publishType: "draft",
    });
    if (res.data.code === 1) {
      ElMessage.success("草稿已保存");
      isPublished.value = true;
      router.replace("/my");
    }
  } finally {
    savingDraft.value = false;
  }
};

const aiSuggestTitle = async () => {
  const text = editorRef.value?.getText().trim() || "";
  if (!text) {
    ElMessage.warning("请先输入帖子内容");
    return;
  }
  aiLoading.value = true;
  try {
    const { aiGenerateTitlesApi } = await import("@/api/aiApi");
    const res = await aiGenerateTitlesApi(text);
    if (res.data.code === 1 && res.data.data?.length) {
      const titles = res.data.data;
      const { value: chosen } = await ElMessageBox.prompt(
        titles.map((t, i) => `${i + 1}. ${t}`).join("\n"),
        "AI 推荐标题（输入序号选择）",
        { confirmButtonText: "使用", cancelButtonText: "取消" },
      );
      const idx = parseInt(chosen) - 1;
      if (idx >= 0 && idx < titles.length) {
        title.value = titles[idx];
        ElMessage.success("已填入标题");
      }
    }
  } catch {
    /* cancelled or error */
  } finally {
    aiLoading.value = false;
  }
};

const handleBackClick = () => {
  // 发布页可能是深链/新标签打开，站内无历史时回首页，避免「返回没反应」
  goBack();
};

onBeforeRouteLeave(async (to, from, next) => {
  if (isPublished.value) {
    next();
    return;
  }
  const hasContent =
    title.value.trim() ||
    (valueHtml.value && valueHtml.value !== "<p><br></p>") ||
    coverFile.value ||
    hasUploadedImg.value ||
    selectedTags.value.length > 0;

  if (hasContent) {
    try {
      await ElMessageBox.confirm(
        "当前内容未发布，退出将删除已上传的临时图片并丢失编辑内容，是否继续？",
        "提示",
        {
          confirmButtonText: "确定退出",
          cancelButtonText: "取消",
          type: "warning",
        },
      );
      next();
    } catch {
      next(false);
    }
  } else {
    next();
  }
});

onMounted(async () => {
  await getCategoryList();
  const draftId = route.query.draftId;
  if (draftId) {
    const detailRes = await getPostDetailApi(draftId);
    if (detailRes.data?.code === 1 && detailRes.data.data) {
      const data = detailRes.data.data;
      id.value = data.id;
      title.value = data.title || "";
      categoryId.value = data.categoryId == null ? "" : String(data.categoryId);
      selectedTags.value = (data.tags || []).map((t) => t.name).filter(Boolean);
      isPrivate.value = Boolean(data.isPrivate);
      valueHtml.value = data.content || "";
      coverUrl.value = data.cover || "";
      hasUploadedImg.value = Boolean(data.cover);
      isEditingDraft.value = true;
      if (data.status === "scheduled" && data.publishTime) {
        scheduleEnabled.value = true;
        scheduleTime.value = new Date(data.publishTime);
      }
    } else {
      ElMessage.error("草稿不存在或已删除");
      router.replace("/drafts");
      return;
    }
  } else {
    const res = await getPostIdApi();
    id.value = res.data.data;
    if (id.value === null) ElMessage.error("网络错误");
  }
  await loadSuggestedTags(categoryId.value || null);
  window.addEventListener("beforeunload", handleBeforeUnload);

  // 检查是否从 AI 助手携带了草稿
  const state = history.state;
  if (
    state &&
    (state.draftTitle ||
      state.draftContent ||
      state.draftCategory ||
      state.draftTags)
  ) {
    if (state.draftTitle) {
      title.value = state.draftTitle;
    }
    if (state.draftCategory && categoryList.value?.length) {
      const matched = categoryList.value.find(
        (c) =>
          c.name === state.draftCategory ||
          state.draftCategory.includes(c.name) ||
          c.name.includes(state.draftCategory),
      );
      if (matched) {
        categoryId.value = matched.id;
      }
    }
    if (state.draftTags) {
      const rawList = Array.isArray(state.draftTags)
        ? state.draftTags
        : String(state.draftTags).split(/[,，、\s]+/);
      rawList.slice(0, MAX_TAGS).forEach((t) => addTag(t));
    }
    if (state.draftContent) {
      // 将文本换行格式化为富文本编辑器段落
      const paragraphs = state.draftContent
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${p}</p>`)
        .join("");
      valueHtml.value = paragraphs || `<p>${state.draftContent}</p>`;
    }
    ElMessage.success(
      "已自动填入小Y为你生成的发帖草稿，请继续完善封面或内容！",
    );
  }
});

onBeforeUnmount(async () => {
  if (tagSearchTimer) clearTimeout(tagSearchTimer);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  await cleanupResources();
  const editor = editorRef.value;
  if (editor != null) editor.destroy();
});
</script>

<template>
  <div class="public-page" v-loading="loading">
    <PageHeader
      :title="isEditingDraft ? '编辑草稿' : '发布帖子'"
      @click="handleBackClick"
    />

    <div class="form-card">
      <div class="section">
        <div class="section-label">上传封面</div>
        <div class="section-hint">
          图片比例为 5:3，格式为 jpg/png，自动压缩后不超过 8MB
        </div>
        <CoverUploader @change="coverFile = $event" />
      </div>

      <div class="section">
        <div class="section-label">标题</div>
        <el-input
          v-model="title"
          placeholder="请输入标题（必填）"
          maxlength="80"
          show-word-limit
          size="large"
        />
      </div>

      <div class="section">
        <div class="section-label">内容</div>
        <div class="editor-wrapper">
          <Toolbar
            :editor="editorRef"
            :defaultConfig="toolbarConfig"
            :mode="mode"
          />
          <div class="editor-toolbar-hint" aria-hidden="true">
            左右滑动工具栏查看更多
          </div>
          <Editor
            v-model="valueHtml"
            :defaultConfig="editorConfig"
            :mode="mode"
            @onCreated="handleCreated"
          />
        </div>
      </div>

      <div class="section">
        <div class="section-label">分类</div>
        <div class="section-hint">
          {{
            selectedCategory?.description ||
            "选择一个内容专栏（默认归入“其他”，选定后将同步推荐该分类热门标签）"
          }}
        </div>
        <div class="category-picker">
          <button
            v-for="item in categoryList"
            :key="item.id"
            type="button"
            class="cat-option"
            :class="{ active: String(categoryId) === String(item.id) }"
            :style="{ '--cat-color': item.color || 'var(--el-color-primary)' }"
            @click="selectCategory(item)"
          >
            <span class="cat-icon">{{ categoryIconFor(item) }}</span>
            <span class="cat-name">{{ item.name }}</span>
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-label-row">
          <span class="section-label">标签</span>
          <span class="tag-counter"
            >已选 {{ selectedTags.length }} / {{ MAX_TAGS }}</span
          >
        </div>
        <div class="section-hint">
          添加话题标签能让对口的读者在推荐流与搜索中更快发现你的内容（按回车创建新标签）
        </div>

        <div class="tag-editor">
          <div v-if="selectedTags.length" class="selected-tags">
            <span
              v-for="(tag, index) in selectedTags"
              :key="tag"
              class="selected-tag-chip"
            >
              <span>#{{ tag }}</span>
              <button
                type="button"
                class="tag-remove-btn"
                :aria-label="`移除标签 ${tag}`"
                @click="removeTag(index)"
              >
                <el-icon :size="11"><Close /></el-icon>
              </button>
            </span>
          </div>

          <div v-if="selectedTags.length < MAX_TAGS" class="tag-input-box">
            <div class="tag-input-row">
              <span class="tag-hash">#</span>
              <input
                v-model="tagInput"
                type="text"
                class="tag-native-input"
                maxlength="20"
                placeholder="输入标签名（如 SpringBoot / 旅拍 / 评测）"
                @input="handleTagInput"
                @keydown.enter.prevent="addTag()"
              />
              <button
                type="button"
                class="tag-add-btn"
                :disabled="!normalizeTagName(tagInput)"
                @click="addTag()"
              >
                <el-icon :size="13"><Plus /></el-icon>
                <span>添加</span>
              </button>
            </div>

            <div
              v-if="
                normalizeTagName(tagInput) &&
                (tagSearchResults.length || tagSearching)
              "
              class="tag-autocomplete"
            >
              <div
                v-if="tagSearching && !tagSearchResults.length"
                class="tag-searching"
              >
                正在检索已有标签...
              </div>
              <button
                v-for="item in tagSearchResults"
                :key="item.id"
                type="button"
                class="tag-suggestion-item"
                @click="addTag(item.name)"
              >
                <span>#{{ item.name }}</span>
                <span class="suggestion-count"
                  >{{ item.useCount || 0 }} 篇</span
                >
              </button>
            </div>
          </div>

          <div v-if="availableSuggestedTags.length" class="suggested-tags-row">
            <span class="suggest-label">
              {{
                selectedCategory
                  ? `「${selectedCategory.name}」推荐标签：`
                  : "社区热门标签："
              }}
            </span>
            <button
              v-for="tag in availableSuggestedTags.slice(0, 10)"
              :key="tag.id || tag.name"
              type="button"
              class="suggest-tag-chip"
              :disabled="selectedTags.length >= MAX_TAGS"
              @click="addTag(tag.name)"
            >
              + #{{ tag.name }}
            </button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-label">可见范围</div>
        <div class="privacy-row">
          <div class="privacy-info">
            <span class="privacy-title">
              <el-icon><Lock /></el-icon>
              设为私密帖子
            </span>
            <span class="privacy-desc"
              >开启后仅自己可见，不进入首页推荐流，也不会推送给粉丝</span
            >
          </div>
          <el-switch v-model="isPrivate" />
        </div>
      </div>

      <div class="submit-area">
        <el-button
          size="large"
          class="draft-btn"
          :loading="savingDraft"
          @click="saveDraft"
          >存草稿</el-button
        >
        <el-button
          size="large"
          class="ai-btn"
          :loading="aiLoading"
          @click="aiSuggestTitle"
          >✨ AI标题</el-button
        >
        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="handleOpenPublishDialog"
          >发布</el-button
        >
      </div>
    </div>

    <el-dialog
      v-model="dialogConfirmVisible"
      title="确认发布?"
      width="min(90vw, 400px)"
      center
      :close-on-click-modal="!loading"
      :show-close="!loading"
    >
      <p
        style="
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 10px;
        "
      >
        {{
          isPrivate
            ? "该帖子将设为私密，仅自己可见"
            : "发布后所有社区成员均可浏览该帖子"
        }}
      </p>
      <div class="confirm-meta">
        <span>分类：{{ selectedCategory?.name || "其他" }}</span>
        <span v-if="selectedTags.length">
          标签：{{ selectedTags.map((t) => `#${t}`).join(" ") }}
        </span>
      </div>
      <template #footer>
        <div class="dialog-footer-row">
          <el-checkbox v-model="scheduleEnabled" size="small"
            >定时发布</el-checkbox
          >
          <el-date-picker
            v-if="scheduleEnabled"
            v-model="scheduleTime"
            type="datetime"
            placeholder="选择发布时间"
            size="small"
            :disabled-date="disabledScheduleDate"
            style="width: 200px"
          />
        </div>
        <div class="dialog-footer-row">
          <el-button :disabled="loading" @click="dialogConfirmVisible = false"
            >取消</el-button
          >
          <el-button type="primary" :loading="loading" @click="publicPost"
            >确认发布</el-button
          >
        </div>
      </template>
    </el-dialog>

    <!-- 正文插图裁切 (支持自由/原图/常用比例切换) -->
    <ImageCropper
      v-model="editorCropperVisible"
      :file="editorCropperFile"
      title="裁切正文插图"
      :aspect-ratio="0"
      :allow-ratio-change="true"
      @confirm="onEditorImageCropped"
    />
  </div>
</template>

<style lang="scss" scoped>
.public-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 16px 16px 40px;
}

.form-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);

  .section {
    margin-bottom: 24px;

    .section-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .section-hint {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }
  }
}

.editor-toolbar-hint {
  display: none;
}

.editor-wrapper {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;

  :deep(.w-e-toolbar) {
    border-bottom: 1px solid var(--border-light);
  }

  :deep(.w-e-text-container) {
    height: 400px;
  }
}

.section-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;

  .tag-counter {
    font-size: 12px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
}

.category-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cat-option {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--cat-color, var(--el-color-primary));
    color: var(--text-ink);
  }

  &.active {
    border-color: var(--cat-color, var(--el-color-primary));
    background: color-mix(
      in srgb,
      var(--cat-color, var(--el-color-primary)) 13%,
      var(--bg-card)
    );
    color: var(--text-ink);
    font-weight: 600;
    box-shadow: var(--shadow-xs);
  }

  .cat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm);
    background: var(--cat-color, var(--el-color-primary));
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }
}

.tag-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  color: var(--el-color-primary);
  font-size: 12.5px;
  font-weight: 500;

  .tag-remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: 0;

    &:hover {
      background: var(--el-color-primary-light-7);
    }
  }
}

.tag-input-box {
  position: relative;
  max-width: 440px;
}

.tag-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-card);

  &:focus-within {
    border-color: var(--el-color-primary);
  }

  .tag-hash {
    color: var(--text-muted);
    font-weight: 600;
  }

  .tag-native-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 13.5px;
    font-family: inherit;
    padding: 4px 0;
  }

  .tag-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 4px 10px;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-size: 12.5px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}

.tag-autocomplete {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.tag-searching {
  padding: 8px 10px;
  font-size: 12.5px;
  color: var(--text-muted);
}

.tag-suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--bg-subtle);
    color: var(--el-color-primary);
  }

  .suggestion-count {
    font-size: 11.5px;
    color: var(--text-muted);
  }
}

.suggested-tags-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;

  .suggest-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .suggest-tag-chip {
    padding: 3px 9px;
    border-radius: var(--radius-full);
    border: 1px dashed var(--border-default);
    background: transparent;
    color: var(--text-secondary);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}

.confirm-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: var(--text-muted);
  text-align: center;
}

.privacy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: var(--bg-subtle);
  border-radius: var(--radius-md);

  .privacy-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .privacy-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-ink);
  }

  .privacy-desc {
    font-size: 12.5px;
    color: var(--text-muted);
  }
}

.submit-area {
  padding-top: 24px;
  border-top: 1px solid var(--border-light);

  .submit-btn {
    width: 100%;
    max-width: 320px;
    background: var(--gradient-primary);
    border: none;
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--glow-primary);
    }
  }
}

@media (max-width: 640px) {
  .public-page {
    padding: 10px 8px calc(152px + env(safe-area-inset-bottom, 0px));
  }

  .form-card {
    padding: 18px 14px;
    border-radius: var(--radius-lg);
  }

  .editor-wrapper {
    :deep(.w-e-toolbar) {
      overflow-x: auto;
      flex-wrap: nowrap;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar {
        height: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--border-default);
      }
    }

    :deep(.w-e-text-container) {
      height: 300px;
    }
  }

  .tag-input-box {
    max-width: 100%;
  }

  .editor-toolbar-hint {
    display: block;
    padding: 4px 2px 2px;
    font-size: 11px;
    color: var(--text-muted);
  }

  .submit-area {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(56px + env(safe-area-inset-bottom, 0px));
    z-index: 60;
    display: flex;
    gap: 8px;
    padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
    background: var(--glass-bg);
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--border-light);
  }

  .submit-area .draft-btn,
  .submit-area .ai-btn,
  .submit-area .submit-btn {
    flex: 1;
    max-width: none;
    margin: 0 !important;
  }
}
</style>

<style lang="scss">
// WangEditor 自带浅色样式，暗色模式下覆盖其 CSS 变量，
// 使编辑器正文区、工具栏、弹窗等跟随项目暗色主题。
html.dark {
  // 编辑区
  --w-e-textarea-bg-color: #181715;
  --w-e-textarea-color: #faf9f5;
  --w-e-textarea-border-color: #333230;
  --w-e-textarea-slight-border-color: #2a2925;
  --w-e-textarea-slight-color: #6c6a64;
  --w-e-textarea-slight-bg-color: #252320;
  --w-e-textarea-selected-border-color: #d99580;
  --w-e-textarea-handler-bg-color: #d99580;

  // 工具栏
  --w-e-toolbar-color: #d4d2cc;
  --w-e-toolbar-bg-color: #181715;
  --w-e-toolbar-active-color: #faf9f5;
  --w-e-toolbar-active-bg-color: #333230;
  --w-e-toolbar-disabled-color: #504e49;
  --w-e-toolbar-border-color: #2a2925;

  // 弹窗 / 下拉面板
  --w-e-modal-button-bg-color: #252320;
  --w-e-modal-button-border-color: #333230;
}
</style>
