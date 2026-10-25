<script setup>
import { ref, onMounted, shallowRef, onBeforeUnmount } from "vue";
import {
  getPostCategoryApi,
  getPostIdApi,
  publishPostApi,
} from "@/api/postApi";
import { deletePostImgApi, uploadPostImgApi } from "@/api/uploadApi";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import "@wangeditor/editor/dist/css/style.css";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import ImageCropper from "@/components/ImageCropper.vue";
import CoverUploader from "@/components/publish/CoverUploader.vue";
import compressImage from "@/utils/compressImage";
import { uploadWithDedup } from "@/utils/uploadDedup";

const router = useRouter();

// ---- Form & Editor State ----
const id = ref("");
const title = ref("");
const categoryId = ref("");
const categoryList = ref([]);
const valueHtml = ref("");
const editorRef = shallowRef();
const loading = ref(false);
const dialogConfirmVisible = ref(false);
const isPublished = ref(false);

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
    ElMessage.error("图片上传失败，请重试");
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
};const cleanupResources = async () => {
  if (isPublished.value) return;
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
  dialogConfirmVisible.value = true;
};

const publicPost = async () => {
  let coverUrl = null;
  loading.value = true;
  try {
    if (coverFile.value) {
      // 秒传：命中哈希直接复用服务端已有 URL，跳过文件传输
      coverUrl = await uploadWithDedup(coverFile.value, {
        postId: id.value,
        upload: uploadPostImgApi,
      });
      if (coverUrl) hasUploadedImg.value = true;
    }
    const res = await publishPostApi({
      id: id.value,
      cover: coverUrl,
      title: title.value.trim(),
      content: valueHtml.value,
      // 未选择分类时传 null，后端默认归入“其他”分类
      categoryId: categoryId.value === "" ? null : categoryId.value,
    });
    dialogConfirmVisible.value = false;
    if (res.data.code !== 1) return;
    ElMessage.success(res.data.message);
    isPublished.value = true;
    router.back();
  } catch {
    ElMessage.error("发布失败，请重试");
  } finally {
    loading.value = false;
  }
};

const handleBackClick = () => {
  router.back();
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
    hasUploadedImg.value;

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
  // 清理可能遗留的旧草稿
  localStorage.removeItem("y_community_post_draft");
  await getCategoryList();
  const res = await getPostIdApi();
  id.value = res.data.data;
  if (id.value === null) ElMessage.error("网络错误");
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(async () => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  await cleanupResources();
  const editor = editorRef.value;
  if (editor != null) editor.destroy();
});
</script>

<template>
  <div class="public-page" v-loading="loading">
    <PageHeader title="发布帖子" @click="handleBackClick" />

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
        <el-select
          v-model="categoryId"
          placeholder="请选择分类（默认：其他）"
          clearable
          class="category-select"
        >
          <el-option
            v-for="item in categoryList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </div>

      <div class="submit-area">
        <el-button
          type="primary"
          size="large"
          class="submit-btn"
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
    >
      <p
        style="
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 8px;
        "
      >
        发布后所有社区成员均可浏览该帖子
      </p>
      <template #footer>
        <el-button @click="dialogConfirmVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="publicPost"
          >确认发布</el-button
        >
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

.category-select {
  width: 240px;
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
    padding: 10px 8px 36px;
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

  .category-select {
    width: 100% !important;
  }

  .submit-area .submit-btn {
    max-width: 100%;
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
