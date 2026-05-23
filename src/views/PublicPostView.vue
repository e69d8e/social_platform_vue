<script setup>
import { ref, onMounted, shallowRef, onBeforeUnmount } from "vue";
import { getPostCategoryApi, getPostIdApi, publicPostApi } from "@/api/postApi";
import { deletePostImgApi, uploadPostImgApi } from "@/api/uploadApi";
import { useRouter } from "vue-router";
import "@wangeditor/editor/dist/css/style.css"; // 引入 css
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import { ElMessage, ElMessageBox } from "element-plus";

const router = useRouter();
const dialogImageUrl = ref("");
const dialogVisible = ref(false);
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
  // 获取帖子id
  const res = await getPostIdApi();
  id.value = res.data.data;
  if (id.value === null) {
    ElMessage.error("网络错误");
  }
  console.log(id.value);

  // 监听浏览器刷新/关闭事件
  window.addEventListener("beforeunload", handleBeforeUnload);
});
const imageUrl = ref("");

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
  const url = await uploadPostImgApi(file.value, id.value.data.data);

  loading.value = true;

  const res = await publicPostApi({
    id: id.value,
    cover: url.data.data,
    title: title.value,
    content: valueHtml.value,
    categoryId: categoryId.value,
  });
  dialogConfirmVisible.value = false;
  loading.value = false;
  ElMessage({
    message: res.data.message,
    type: "success",
  });
  isPublished.value = true;
  router.back();
};

const editorRef = shallowRef();
const valueHtml = ref("");
const mode = "simple";

const toolbarConfig = {};
// 移除插入视频功能
toolbarConfig.excludeKeys = ["insertVideo"];
const editorConfig = { placeholder: "请输入内容" };
// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});
const handleCreated = (editor) => {
  editorRef.value = editor; // 记录 editor 实例
};

editorConfig.MENU_CONF = {};
editorConfig.MENU_CONF["uploadImage"] = {
  // 最多可上传1个文件
  maxNumberOfFiles: 1,

  // 自定义上传
  async customUpload(file, insertFn) {
    // file 即选中的文件
    // 自己实现上传，并得到图片 url alt href
    const res = await uploadPostImgApi(file, id.value);
    const url = res.data.data;
    const alt = "图片描述";
    const href = url;
    // 最后插入图片
    insertFn(url, alt, href);
  },
};

const file = ref();
let oldObjectUrl = null;
const handleAvatarChange = (uploadFile) => {
  // 1. 释放之前的 URL 对象
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl);
  }
  // 生成本地 Blob URL 用于即时预览
  imageUrl.value = URL.createObjectURL(uploadFile.raw);
  oldObjectUrl = imageUrl.value;
  file.value = uploadFile.raw;
};

// 处理浏览器刷新/关闭
const handleBeforeUnload = (e) => {
  if (!isPublished.value && id.value) {
    // 注意：现代浏览器在 beforeunload 中通常不执行异步请求，
    // 但我们可以尝试发送一个同步信标(navigator.sendBeacon)或者仅仅依赖后端GC。
    // 如果必须确保删除，最好是在用户点击“返回”或“取消”时处理。
    // 这里仅做标记，实际删除主要依赖 onBeforeUnmount 和手动返回按钮

    // 某些浏览器允许这样提示用户
    e.preventDefault();
    e.returnValue = "";
  }
};

// 组件卸载清理
onBeforeUnmount(() => {
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl);
  }
  // 原有的编辑器销毁逻辑
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});

const isPublished = ref(false);
// 统一的清理函数
const cleanupResources = async () => {
  // 如果已经发布，不需要清理
  if (isPublished.value) {
    return;
  }

  // 如果有 ID，尝试删除服务器上的临时文件
  if (id.value) {
    try {
      console.log("正在清理未发布的临时资源，ID:", id.value);
      await deletePostImgApi(id.value);
    } catch (error) {
      console.error("清理临时文件失败:", error);
    }
  }

  // 清理本地 Blob URL
  if (oldObjectUrl) {
    URL.revokeObjectURL(oldObjectUrl);
    oldObjectUrl = null;
  }
};

// 组件销毁时（路由切换、后退等）
onBeforeUnmount(() => {
  // 移除监听器
  window.removeEventListener("beforeunload", handleBeforeUnload);

  // 执行清理
  cleanupResources();

  // 销毁编辑器
  const editor = editorRef.value;
  if (editor != null) {
    editor.destroy();
  }
});

// 处理手动点击返回按钮
const handleBackClick = async () => {
  // 可选：添加确认框，防止用户误触导致辛苦编辑的内容丢失
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
      // 用户确认后，router.back() 会触发 onBeforeUnmount，从而执行 cleanupResources
      router.back();
    } catch {
      // 用户取消，什么都不做
    }
  } else {
    router.back();
  }
};
</script>
<template>
  <el-row>
    <el-col :span="2"></el-col>
    <el-col :span="20" :offset="0">
      <div class="public" v-loading="loading">
        <div class="header">发布帖子</div>
        <div class="pointer back" @click="handleBackClick">
          <el-icon size="large"><ArrowLeft /></el-icon>
        </div>
        <div class="img">
          <div class="please">
            请上传封面(图片比例为5:3，格式为 jpg/jpeg，大小小于 8MB)
          </div>
          <!-- <el-upload
        v-model:file-list="fileList"
        action="http://127.0.0.1:8080/api/upload/post"
        list-type="picture-card"
        :on-preview="handlePictureCardPreview"
        :on-remove="handleRemove"
      >
        <el-icon><Plus /></el-icon>
      </el-upload> -->
          <el-upload
            class="uploader"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleAvatarChange"
            :before-upload="beforeUpload"
          >
            <img v-if="imageUrl" :src="imageUrl" class="cover" />
            <el-icon v-else class="uploader-icon"><Plus /></el-icon>
          </el-upload>
        </div>
        <div class="title">
          <el-input
            v-model="title"
            autosize
            type="textarea"
            placeholder="请输入标题"
          />
        </div>
        <!-- <div class="content">
      <el-input
        v-model="content"
        style="width: 500px"
        :autosize="{ minRows: 2, maxRows: 4 }"
        type="textarea"
        placeholder="请输入内容"
      />
    </div> -->
        <div class="content" v-html="valueHtml"></div>
        <div class="editor" style="border: 1px solid #ccc">
          <Toolbar
            style="border-bottom: 1px solid #ccc"
            :editor="editorRef"
            :defaultConfig="toolbarConfig"
            :mode="mode"
          />
          <Editor
            style="height: 500px; overflow-y: hidden"
            v-model="valueHtml"
            :defaultConfig="editorConfig"
            :mode="mode"
            @onCreated="handleCreated"
          />
        </div>
        <div class="category">
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
        <div class="btn">
          <el-button
            style="width: 500px"
            @click="dialogConfirmVisible = true"
            type="primary"
            >发布</el-button
          >
        </div>
        <el-dialog v-model="dialogVisible">
          <img w-full :src="dialogImageUrl" alt="Preview Image" />
        </el-dialog>

        <el-dialog v-model="dialogConfirmVisible" title="确认发布?" width="500">
          <template #footer>
            <div class="dialog-footer">
              <el-button @click="dialogConfirmVisible = false">取消</el-button>
              <el-button type="primary" @click="publicPost"> 确认 </el-button>
            </div>
          </template>
        </el-dialog>
      </div>
    </el-col>
    <el-col :span="2"></el-col>
  </el-row>
</template>
<style lang="scss" scoped>
.public {
  margin: 20px auto;
  .header {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
  }
  .pointer {
    cursor: pointer;
  }
  .back {
    margin: 20px 0;
  }
  .img {
    margin-bottom: 20px;
    .please {
      font-size: 16px;
      color: #999;
      height: 30px;
    }
    .uploader {
      width: 250px;
      height: 150px;
      border: 1px dashed var(--el-border-color);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      transition: var(--el-transition-duration-fast);
      display: block;
    }
    .cover {
      width: 250px;
      height: 150px;
    }
    .uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 250px;
      height: 150px;
      text-align: center;
    }
  }
  .content {
    overflow: hidden;
  }
  .editor {
    margin: 20px 0;
  }
  .category {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 50px;
  }
}
</style>
