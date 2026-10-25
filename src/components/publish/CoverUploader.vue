<script setup>
import { ref, onBeforeUnmount } from "vue";
import { Plus, Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import ImageCropper from "@/components/ImageCropper.vue";
import compressImage from "@/utils/compressImage";

const emit = defineEmits(["change"]);

// ---- Cover & Upload State ----
const imageUrl = ref("");
const file = ref(null);
const isDragging = ref(false);
const cropperVisible = ref(false);
const cropperFile = ref(null);
let oldObjectUrl = null;

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

// 封面裁切完成：先压缩再校验大小（针对压缩结果），通过后替换待上传文件
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
    emit("change", compressed);
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
  emit("change", null);
};

onBeforeUnmount(() => {
  if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
});
</script>

<template>
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
      <span v-if="!imageUrl" class="cover-empty-text"
        >拖拽图片至此或点击右侧选择</span
      >
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

  <!-- 封面裁切 -->
  <ImageCropper
    v-model="cropperVisible"
    :file="cropperFile"
    title="裁切封面 (5:3)"
    :aspect-ratio="5 / 3"
    @confirm="onCoverCropped"
  />
</template>

<style lang="scss" scoped>
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

@media (max-width: 640px) {
  .cover-area {
    flex-direction: column;
    width: 100%;

    .cover-preview-box {
      width: 100%;
      height: auto;
      aspect-ratio: 5 / 3;
    }

    .cover-actions {
      width: 100%;
      flex-direction: row;
      gap: 10px;

      .cover-uploader {
        flex: 1;

        .upload-trigger {
          width: 100%;
          height: 42px;
          flex-direction: row;
          border-style: solid;
          background: var(--bg-subtle);
          border-radius: var(--radius-md);
        }
      }

      .mobile-remove-cover-btn {
        height: 42px;
        flex: 1;
        width: auto;
      }
    }
  }
}
</style>
