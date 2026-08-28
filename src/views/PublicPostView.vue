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
import compressImage from "@/utils/compressImage";
import { Plus, Delete } from "@element-plus/icons-vue";

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
const isDragging = ref(false);

// ---- Cover & Upload State ----
const imageUrl = ref("");
const file = ref(null);
const hasUploadedImg = ref(false);
const cropperVisible = ref(false);
const cropperFile = ref(null);
let oldObjectUrl = null;

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
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(uploadFile.type)) {
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
    const res = await uploadPostImgApi(compressed, id.value);
    const url = res.data.data;
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

// ---- Cover Upload & Crop Handlers ----
const beforeUpload = (rawFile) => {
  if (rawFile.type !== "image/jpeg" && rawFile.type !== "image/png") {
    ElMessage.error("上传图片格式应为 jpg 或 png!");
    return false;
  }
  return true;
};

const handleCoverChange = (uploadFile) => {
  const raw = uploadFile.raw;
  if (!raw) return;
  if (!["image/jpeg", "image/png"].includes(raw.type)) {
    ElMessage.error("上传图片格式应为 jpg 或 png!");
    return;
  }
  cropperFile.value = raw;
  cropperVisible.value = true;
};

const handleCoverDrop = (e) => {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (!files || !files.length) return;
  const droppedFile = files[0];
  if (!["image/jpeg", "image/png"].includes(droppedFile.type)) {
    ElMessage.error("上传图片格式应为 jpg 或 png!");
    return;
  }
  cropperFile.value = droppedFile;
  cropperVisible.value = true;
};

const onCoverCropped = async (croppedFile) => {
  try {
    const compressed = await compressImage(croppedFile, {
      maxWidth: 1600,
      maxHeight: 960,
      quality: 0.85,
    });
    if (compressed.size / 1024 / 1024 > 8) {
      ElMessage.error("图片压缩后仍超过 8MB，请更换图片");
      return;
    }
    if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
    imageUrl.value = URL.createObjectURL(compressed);
    oldObjectUrl = imageUrl.value;
    file.value = compressed;
  } catch {
    ElMessage.error("图片处理失败，请重新选择");
  }
};

const handleRemoveCover = () => {
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl);
    oldObjectUrl = null;
  }
  imageUrl.value = "";
  file.value = null;
};

// ---- Publishing & Lifecycle ----
const handleBeforeUnload = (e) => {
  if (!isPublished.value && id.value && (title.value || hasUploadedImg.value)) {
    e.preventDefault();
    e.returnValue = "";
  }
};

const cleanupResources = async () => {
  if (isPublished.value) return;
  if (id.value && hasUploadedImg.value) {
    try {
      await deletePostImgApi(id.value);
    } catch {
      // 清理失败不影响页面退出
    }
  }
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl);
    oldObjectUrl = null;
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
  let url = null;
  loading.value = true;
  try {
    if (file.value) {
      url = await uploadPostImgApi(file.value, id.value);
      if (url?.data?.data) hasUploadedImg.value = true;
    }
    const res = await publishPostApi({
      id: id.value,
      cover: url ? url.data.data : null,
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
    file.value ||
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
        <div
          class="cover-area"
          :class="{ 'is-dragging': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleCoverDrop"
        >
          <div class="cover-preview-box" :class="{ 'has-image': imageUrl }">
            <img v-if="imageUrl" :src="imageUrl" class="cover-preview" />
            <div v-if="imageUrl" class="cover-mask" @click="handleRemoveCover">
              <span>点击移除</span>
            </div>
            <span v-if="!imageUrl" class="cover-empty-text">拖拽图片至此或点击右侧选择</span>
          </div>
          <div class="cover-actions">
            <el-upload
              class="cover-uploader"
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleCoverChange"
              :before-upload="beforeUpload"
            >
              <div class="upload-trigger">
                <el-icon size="20"><Plus /></el-icon>
                <span>{{ imageUrl ? "更换封面" : "选择图片" }}</span>
              </div>
            </el-upload>
            <el-button
              v-if="imageUrl"
              type="danger"
              plain
              size="small"
              :icon="Delete"
              class="mobile-remove-cover-btn"
              @click="handleRemoveCover"
            >
              移除封面
            </el-button>
          </div>
        </div>
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
          style="width: 240px"
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
      width="400"
      center
    >
      <p style="text-align: center; color: var(--text-secondary); margin-bottom: 8px;">
        发布后所有社区成员均可浏览该帖子
      </p>
      <template #footer>
        <el-button @click="dialogConfirmVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="publicPost">确认发布</el-button>
      </template>
    </el-dialog>

    <!-- 封面裁切 -->
    <ImageCropper
      v-model="cropperVisible"
      :file="cropperFile"
      title="裁切封面 (5:3)"
      :aspect-ratio="5 / 3"
      @confirm="onCoverCropped"
    />

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

.cover-area {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);

  &.is-dragging {
    outline: 2px dashed var(--el-color-primary);
    outline-offset: 4px;
    background: var(--el-color-primary-light-9);
  }

  .cover-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.cover-preview-box {
  width: 250px;
  height: 150px;
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color var(--transition-base);

  &.has-image {
    border-style: solid;
    border-color: var(--border-light);

    &:hover .cover-mask {
      opacity: 1;
    }
  }
}

.cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-base);
  cursor: pointer;

  span {
    color: #fff;
    font-size: 13px;
  }
}

.cover-empty-text {
  font-size: 13px;
  color: var(--text-placeholder);
  padding: 0 16px;
  text-align: center;
}

.cover-uploader {
  flex-shrink: 0;

  .upload-trigger {
    width: 100px;
    height: 100px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 13px;
    transition: all var(--transition-base);

    &:hover {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary);
    }
  }
}

.mobile-remove-cover-btn {
  width: 100px;
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
  .form-card {
    padding: 20px 16px;
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
