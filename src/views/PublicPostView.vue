<script setup>
import { ref, onMounted, shallowRef, onBeforeUnmount } from "vue";
import { getPostCategoryApi, getPostIdApi, publicPostApi } from "@/api/postApi";
import { deletePostImgApi, uploadPostImgApi } from "@/api/uploadApi";
import { useRouter } from "vue-router";
import "@wangeditor/editor/dist/css/style.css";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
// import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowLeft, Plus } from "@element-plus/icons-vue";

const router = useRouter();
const dialogConfirmVisible = ref(false);
const categoryId = ref("");
const title = ref("");
const loading = ref(false);
const categoryList = ref([]);

const getCategoryList = async () => {
  const res = await getPostCategoryApi();
  categoryList.value = res.data.data;
};

const id = ref("");
onMounted(async () => {
  await getCategoryList();
  const res = await getPostIdApi();
  id.value = res.data.data;
  if (id.value === null) ElMessage.error("网络错误");
  window.addEventListener("beforeunload", handleBeforeUnload);
});

const imageUrl = ref("");
const file = ref();
let oldObjectUrl = null;

const beforeUpload = (rawFile) => {
  if (rawFile.type !== "image/jpeg" && rawFile.type !== "image/png") {
    ElMessage.error("上传图片格式应为 jpg 或 png!");
    return false;
  } else if (rawFile.size / 1024 / 1024 > 8) {
    ElMessage.error("图片大小不能超过 8MB!");
    return false;
  }
  return true;
};

const publicPost = async () => {
  let url = null;
  if (file.value) {
    url = await uploadPostImgApi(file.value, id.value);
  }
  loading.value = true;
  const res = await publicPostApi({
    id: id.value,
    cover: url ? url.data.data : null,
    title: title.value,
    content: valueHtml.value,
    categoryId: categoryId.value,
  });
  dialogConfirmVisible.value = false;
  loading.value = false;
  ElMessage.success(res.data.message);
  isPublished.value = true;
  router.back();
};

const editorRef = shallowRef();
const valueHtml = ref("");
const mode = "simple";
const toolbarConfig = { excludeKeys: ["insertVideo"] };
const editorConfig = { placeholder: "请输入内容..." };

const handleCreated = (editor) => {
  editorRef.value = editor;
};

editorConfig.MENU_CONF = {};
editorConfig.MENU_CONF["uploadImage"] = {
  maxNumberOfFiles: 1,
  async customUpload(file, insertFn) {
    const res = await uploadPostImgApi(file, id.value);
    const url = res.data.data;
    insertFn(url, "图片描述", url);
  },
};

const handleCoverChange = (uploadFile) => {
  if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
  imageUrl.value = URL.createObjectURL(uploadFile.raw);
  oldObjectUrl = imageUrl.value;
  file.value = uploadFile.raw;
};

const handleRemoveCover = () => {
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl);
    oldObjectUrl = null;
  }
  imageUrl.value = "";
  file.value = null;
};

const handleBeforeUnload = (e) => {
  if (!isPublished.value && id.value) {
    e.preventDefault();
    e.returnValue = "";
  }
};

const isPublished = ref(false);

const cleanupResources = async () => {
  if (isPublished.value) return;
  if (id.value) {
    try {
      await deletePostImgApi(id.value);
    } catch {}
  }
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl);
    oldObjectUrl = null;
  }
};

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  cleanupResources();
  const editor = editorRef.value;
  if (editor != null) editor.destroy();
});

const handleBackClick = async () => {
  if (title.value || valueHtml.value || file.value) {
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
      router.back();
    } catch {}
  } else {
    router.back();
  }
};
</script>

<template>
  <div class="public-page" v-loading="loading">
    <div class="page-header">
      <div class="back" @click="handleBackClick">
        <el-icon size="18"><ArrowLeft /></el-icon>
        <span>返回</span>
      </div>
      <span class="page-title">发布帖子</span>
    </div>

    <div class="form-card">
      <div class="section">
        <div class="section-label">上传封面</div>
        <div class="section-hint">
          图片比例为 5:3，格式为 jpg/png，大小小于 8MB
        </div>
        <div class="cover-area">
          <div class="cover-preview-box" :class="{ 'has-image': imageUrl }">
            <img v-if="imageUrl" :src="imageUrl" class="cover-preview" />
            <div v-if="imageUrl" class="cover-mask" @click="handleRemoveCover">
              <span>点击移除</span>
            </div>
            <span v-if="!imageUrl" class="cover-empty-text">未选择图片</span>
          </div>
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
              <span>选择图片</span>
            </div>
          </el-upload>
        </div>
      </div>

      <div class="section">
        <div class="section-label">标题</div>
        <el-input v-model="title" placeholder="请输入标题" size="large" />
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
          placeholder="请选择分类"
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
          @click="dialogConfirmVisible = true"
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
      <template #footer>
        <el-button @click="dialogConfirmVisible = false">取消</el-button>
        <el-button type="primary" @click="publicPost">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.public-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 16px 16px 40px;

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 4px 16px;

    .back {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: var(--el-text-color-regular, #606266);
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
      flex-shrink: 0;
      &:hover {
        color: var(--el-color-primary, #409eff);
        background: var(--el-color-primary-light-9, #ecf5ff);
      }
    }

    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary, #303133);
    }
  }
}

.form-card {
  background: var(--el-bg-color, #ffffff);
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .section {
    margin-bottom: 24px;

    .section-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary, #303133);
      margin-bottom: 8px;
    }

    .section-hint {
      font-size: 13px;
      color: var(--el-text-color-secondary, #909399);
      margin-bottom: 10px;
    }
  }
}

.cover-area {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.cover-preview-box {
  width: 250px;
  height: 150px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.has-image {
    border-style: solid;
    border-color: var(--el-border-color-light, #e4e7ed);

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
  transition: opacity 0.2s;
  cursor: pointer;

  span {
    color: #fff;
    font-size: 13px;
  }
}

.cover-empty-text {
  font-size: 13px;
  color: var(--el-text-color-placeholder, #c0c4cc);
}

.cover-uploader {
  flex-shrink: 0;

  .upload-trigger {
    width: 100px;
    height: 150px;
    border: 1px dashed var(--el-border-color, #dcdfe6);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    color: var(--el-text-color-secondary, #909399);
    font-size: 13px;
    transition: all 0.2s;

    &:hover {
      color: var(--el-color-primary, #409eff);
      border-color: var(--el-color-primary, #409eff);
    }
  }
}

.editor-wrapper {
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  overflow: hidden;

  :deep(.w-e-toolbar) {
    border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  }

  :deep(.w-e-text-container) {
    height: 400px;
  }
}

.submit-area {
  padding-top: 24px;
  border-top: 1px solid var(--el-border-color-light, #e4e7ed);

  .submit-btn {
    width: 100%;
    max-width: 320px;
  }
}

@media (max-width: 640px) {
  .form-card {
    padding: 20px 16px;
  }
}
</style>
