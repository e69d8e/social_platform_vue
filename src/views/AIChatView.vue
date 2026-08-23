<template>
  <div class="chat-page">
    <!-- 移动端：打开会话抽屉 -->
    <button
      class="mobile-menu-btn"
      aria-label="打开会话列表"
      @click="sidebarOpen = true"
    >
      <el-icon :size="18"><Menu /></el-icon>
    </button>

    <!-- 移动端抽屉遮罩 -->
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      @click="sidebarOpen = false"
    ></div>

    <!-- 侧边栏 - 会话列表 -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-brand">
        <el-avatar :size="38" :src="logoUrl" class="brand-logo"></el-avatar>
        <div class="brand-text">
          <span class="brand-title">小Y AI</span>
          <span class="brand-sub">智能助手</span>
        </div>
      </div>

      <div class="sidebar-actions">
        <el-button text class="home-btn" @click="$router.replace('/')">
          <el-icon :size="16"><ArrowLeft /></el-icon>
          首页
        </el-button>
        <button class="new-chat-btn" @click="createNewSession">
          <el-icon :size="15"><Plus /></el-icon>
          新对话
        </button>
      </div>

      <div class="session-list">
        <TransitionGroup name="session">
          <div
            v-for="session in sessions"
            :key="session.id"
            :class="[
              'session-item',
              { active: currentSessionId === session.id },
            ]"
            @click="selectSession(session.id)"
          >
            <el-icon class="session-icon" :size="16"><ChatDotRound /></el-icon>
            <div class="session-name">{{ session.name }}</div>
            <button
              class="delete-btn"
              title="删除会话"
              @click.stop="deleteSession(session.id)"
            >
              <el-icon :size="14"><Close /></el-icon>
            </button>
          </div>
        </TransitionGroup>

        <div v-if="!sessions.length" class="session-empty">
          <el-icon :size="30"><ChatLineRound /></el-icon>
          <p>暂无历史会话</p>
        </div>
      </div>
    </aside>

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <!-- 欢迎页 -->
      <div v-if="!currentSessionId" class="welcome-screen">
        <div class="welcome-logo">
          <el-avatar :size="88" :src="logoUrl"></el-avatar>
        </div>
        <h1>你好，我是小Y</h1>
        <p>你的智能 AI 助手，随时为你答疑解惑、创作内容。</p>
        <button class="start-btn" @click="createNewSession">
          <el-icon :size="16"><ChatDotRound /></el-icon>
          开始对话
        </button>
        <div class="suggestions">
          <span class="suggestions-label">可以试试：</span>
          <button
            v-for="s in suggestions"
            :key="s"
            class="suggestion-chip"
            @click="useSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 聊天容器 -->
      <div v-else class="chat-container">
        <div class="chat-header">
          <div class="chat-header-title">
            <el-avatar :size="34" :src="logoUrl"></el-avatar>
            <div class="chat-header-meta">
              <h3>{{ currentSessionName }}</h3>
              <span class="chat-status">
                <i :class="['status-dot', { loading: isStreamingHere }]"></i>
                {{ isStreamingHere ? "正在输入…" : "AI 助手在线" }}
              </span>
            </div>
          </div>
          <button class="header-new-btn" @click="createNewSession">
            <el-icon :size="15"><Plus /></el-icon>
            新对话
          </button>
        </div>

        <div
          class="messages-container"
          ref="messagesContainer"
          @scroll="onMessagesScroll"
          @click="onMessageClick"
        >
          <div class="messages-inner">
            <div
              v-for="(msg, index) in displayMessages"
              :key="index"
              :class="['message', `${msg.role}-message`]"
            >
              <div class="message-avatar">
                <el-avatar
                  v-if="msg.role === 'user'"
                  :src="userStore.userInfo.avatar"
                ></el-avatar>
                <el-avatar v-else :src="logoUrl"></el-avatar>
              </div>
              <div class="message-body">
                <div class="message-meta">
                  <span class="message-sender">{{
                    msg.role === "user" ? "我" : "小Y AI"
                  }}</span>
                  <span class="message-time">{{
                    formatTime(msg.timestamp)
                  }}</span>
                </div>
                <div class="message-content">
                  <div
                    v-if="msg.role === 'assistant'"
                    class="message-text markdown-body"
                    :class="{
                      streaming:
                        isStreamingHere && index === displayMessages.length - 1,
                    }"
                    v-html="renderCached(msg.content)"
                  ></div>
                  <div v-else class="message-text">{{ msg.content }}</div>
                </div>
              </div>
            </div>

            <!-- 加载指示器 -->
            <div v-if="showTyping" class="message assistant-message">
              <div class="message-avatar">
                <el-avatar :src="logoUrl"></el-avatar>
              </div>
              <div class="message-body">
                <div class="message-meta">
                  <span class="message-sender">小Y AI</span>
                </div>
                <div class="message-content">
                  <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="input-area">
          <!-- 回到底部（锚定输入区，随输入框增高上移） -->
          <Transition name="back-bottom">
            <button
              v-show="!isNearBottom"
              class="back-bottom-btn"
              type="button"
              aria-label="回到底部"
              title="回到底部"
              @click="jumpToBottom"
            >
              <el-icon :size="16"><ArrowDownBold /></el-icon>
            </button>
          </Transition>

          <div class="input-box">
            <textarea
              ref="inputRef"
              v-model="inputMessage"
              @keydown="handleKeyPress"
              placeholder="输入消息，Enter 发送，Shift+Enter 换行"
              :disabled="isLoading"
              rows="1"
            ></textarea>
            <div class="input-toolbar">
              <span class="input-hint">Enter 发送 · Shift+Enter 换行</span>
              <button
                class="send-btn"
                :disabled="!inputMessage.trim() || isLoading"
                @click="sendMessage"
              >
                <el-icon :size="15"><Promotion /></el-icon>
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  createSessionApi,
  deleteSessionApi,
  getSessionApi,
  getSessionContentApi,
} from "@/api/aiApi";
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue";
import {
  ArrowDownBold,
  ArrowLeft,
  ChatDotRound,
  ChatLineRound,
  Close,
  Menu,
  Plus,
  Promotion,
} from "@element-plus/icons-vue";
import DOMPurify from "dompurify";
import { baseURL, logoUrl } from "@/utils/request";
import { authFetch } from "@/utils/authFetch";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// ============ 工具函数 ============
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 行内 Markdown 渲染
function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

// 简易 Markdown 渲染（已做 HTML 转义 + DOMPurify 双重防护）
function renderMarkdown(md) {
  if (!md) return "";
  const src = String(md).replace(/\r\n?/g, "\n");

  // 1. 提取围栏代码块
  const blocks = [];
  const text = src.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (m, lang, code) => {
    blocks.push({ lang: lang.trim(), code: code.replace(/\n$/, "") });
    return `\uE000${blocks.length - 1}\uE000`;
  });

  const lines = text.split("\n");
  const out = [];
  let list = null;

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 代码块占位符
    if (/^\uE000\d+\uE000$/.test(trimmed)) {
      closeList();
      out.push(trimmed);
      continue;
    }

    // 空行结束列表
    if (!trimmed) {
      closeList();
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // 分割线
    if (/^([-*_])(\s*\1){2,}\s*$/.test(trimmed)) {
      closeList();
      out.push("<hr />");
      continue;
    }

    // 引用
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      closeList();
      out.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    // 无序列表
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    // 有序列表
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    // 普通段落
    closeList();
    out.push(`<p>${renderInline(trimmed)}</p>`);
  }
  closeList();

  let html = out.join("\n");

  // 2. 回填代码块
  html = html.replace(/\uE000(\d+)\uE000/g, (m, i) => {
    const b = blocks[Number(i)];
    const cls = b.lang ? ` class="language-${escapeHtml(b.lang)}"` : "";
    return `<pre><code${cls}>${escapeHtml(b.code)}</code></pre>`;
  });

  return DOMPurify.sanitize(html);
}

// 带缓存的渲染：同一内容只渲染一次（流式期间历史消息不重复解析）
function renderCached(content) {
  if (!content) return "";
  if (mdCache.has(content)) return mdCache.get(content);
  const html = renderMarkdown(content);
  if (mdCache.size > 300) mdCache.clear();
  mdCache.set(content, html);
  return html;
}

// 时间格式化
function formatTime(ts) {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return hm;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

// ============ 响应式数据 ============
const sessions = ref([]);
const currentSessionId = ref(null);
const rawMessages = ref([]); // 存储原始消息数据
const inputMessage = ref("");
const isLoading = ref(false);
const currentPage = ref(1);
const pageSize = 10;

const suggestions = [
  "帮我写一段周报",
  "解释一下什么是机器学习",
  "给我推荐几本好书",
];

// DOM refs
const messagesContainer = ref(null);
const inputRef = ref(null);

// 是否停留在底部附近（决定流式输出时是否自动跟随滚动）
const isNearBottom = ref(true);
// 移动端会话抽屉
const sidebarOpen = ref(false);
// 正在流式输出的会话id（isLoading 可能属于已切走的会话）
const streamingSessionId = ref(null);
let streamController = null;

// Markdown 渲染缓存：流式输出时仅最后一条变化，其余消息避免重复渲染
const mdCache = new Map();

// 当前会话名称
const currentSessionName = computed(() => {
  const s = sessions.value.find((it) => it.id === currentSessionId.value);
  return s?.name || "新对话";
});

// 计算属性：将原始消息转换为显示格式
const displayMessages = computed(() => {
  return (
    rawMessages.value
      .filter((msg) => msg.type === "USER" || msg.type === "AI")
      .map((msg) => {
        if (msg.type === "USER") {
          // 用户消息格式
          const content = msg.contents?.[0]?.text || "";
          return {
            role: "user",
            content: content,
            timestamp: msg.timestamp || new Date(),
          };
        } else if (msg.type === "AI") {
          // AI消息格式
          const content = msg.text || "";
          return {
            role: "assistant",
            content: content,
            timestamp: msg.timestamp || new Date(),
          };
        }
        return null;
      })
      .filter((msg) => msg !== null)
      // 流式输出时隐藏空的 AI 占位气泡（由打字指示器替代）
      .filter((msg) => !(msg.role === "assistant" && !msg.content))
  );
});

// 当前会话是否正在流式输出（与 isLoading 区分：别的会话可能仍在后台收尾）
const isStreamingHere = computed(
  () => isLoading.value && streamingSessionId.value === currentSessionId.value,
);

// 是否显示打字指示器：当前会话正在加载且 AI 尚未输出任何文字
const showTyping = computed(() => {
  if (!isStreamingHere.value) return false;
  const last = displayMessages.value[displayMessages.value.length - 1];
  if (!last || last.role !== "assistant") return true;
  return !last.content;
});

// ---------- 滚动控制 ----------
const scrollToBottom = async (smooth = true) => {
  await nextTick();
  const el = messagesContainer.value;
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
};

// 判断用户是否停留在底部附近：流式输出只在用户位于底部时才跟随
const onMessagesScroll = () => {
  const el = messagesContainer.value;
  if (!el) return;
  isNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
};

const jumpToBottom = () => {
  isNearBottom.value = true;
  scrollToBottom(true);
};

// 加载会话列表
const loadSessions = async () => {
  try {
    const res = await getSessionApi(currentPage.value, pageSize);
    if (res.data.code === 1) {
      sessions.value = res.data.data || [];
    }
  } catch (error) {
    console.error("加载会话列表失败:", error);
    ElMessage.error("加载会话列表失败");
  }
};

// 创建新会话（回复期间不允许新建，避免流式数据串台）
const createNewSession = async () => {
  if (isLoading.value) {
    ElMessage.info("AI 正在回复中，请稍候再开新对话");
    return;
  }
  try {
    const res = await createSessionApi();
    if (res.data.code === 1) {
      currentSessionId.value = res.data.data;
      rawMessages.value = [];
      isNearBottom.value = true;
      sidebarOpen.value = false;
      await loadSessions();
      // 聚焦到输入框
      await nextTick();
      inputRef.value?.focus();
      autoResize();
    }
  } catch (error) {
    console.error("创建会话失败:", error);
    ElMessage.error("创建会话失败");
  }
};

// 点击建议问题：直接发送（主流 AI 聊天交互）
const useSuggestion = async (text) => {
  if (isLoading.value) return;
  if (!currentSessionId.value) {
    await createNewSession();
  }
  if (!currentSessionId.value) return;
  inputMessage.value = text;
  await nextTick();
  autoResize();
  sendMessage();
};

// 选择会话：切换时中断当前会话的流式输出，防止消息写串
const selectSession = async (sessionId) => {
  if (currentSessionId.value === sessionId) return;
  abortActiveStream();
  currentSessionId.value = sessionId;
  sidebarOpen.value = false;
  try {
    const res = await getSessionContentApi(sessionId);
    // 防止快速连点时旧请求回写（以当前选中为准）
    if (res.data.code === 1 && currentSessionId.value === sessionId) {
      rawMessages.value = JSON.parse(res.data.data) || [];
      isNearBottom.value = true;
      await scrollToBottom(false);
    }
  } catch (error) {
    console.error("加载会话消息失败:", error);
    ElMessage.error("加载会话消息失败");
  }
};

// 中断正在进行的流式请求
const abortActiveStream = () => {
  streamController?.abort();
};

// 删除会话（二次确认，防止误删）
const deleteSession = async (sessionId) => {
  try {
    await ElMessageBox.confirm(
      "删除后无法恢复，确定删除该会话吗？",
      "删除会话",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return; // 用户取消
  }
  try {
    const res = await deleteSessionApi(sessionId);
    if (res.data.code === 1) {
      if (currentSessionId.value === sessionId) {
        abortActiveStream();
        currentSessionId.value = null;
        rawMessages.value = [];
      }
      await loadSessions();
      ElMessage.success("会话已删除");
    }
  } catch (error) {
    console.error("删除会话失败:", error);
    ElMessage.error("删除会话失败");
  }
};

// 发送消息
const sendMessage = async () => {
  const content = inputMessage.value.trim();
  if (!content || isLoading.value) return;

  // 先保存用户输入，再清空输入框（建会话失败时回填）
  inputMessage.value = "";
  autoResize();
  isNearBottom.value = true;

  // 如果没有会话，先创建会话
  if (!currentSessionId.value) {
    try {
      const res = await createSessionApi();
      if (res.data.code === 1) {
        currentSessionId.value = res.data.data;
        await loadSessions();
      } else {
        inputMessage.value = content;
        ElMessage.error("创建会话失败");
        return;
      }
    } catch {
      inputMessage.value = content;
      ElMessage.error("创建会话失败");
      return;
    }
  }

  const sentSessionId = currentSessionId.value;

  // 添加用户消息到原始数据
  rawMessages.value.push({
    type: "USER",
    contents: [{ text: content, type: "TEXT" }],
    timestamp: new Date(),
  });
  await scrollToBottom(true);

  isLoading.value = true;
  streamingSessionId.value = sentSessionId;
  streamController = new AbortController();

  try {
    const response = await authFetch(baseURL + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: streamController.signal,
      body: JSON.stringify({
        userId: userStore.userInfo.id,
        memoryId: sentSessionId,
        content,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";

    // 添加AI消息占位符
    rawMessages.value.push({
      type: "AI",
      text: "",
      toolExecutionRequests: [],
      attributes: {},
      timestamp: new Date(),
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      aiResponse += decoder.decode(value, { stream: true });

      // 会话未切换才写入，防止流式数据写进别的会话
      if (currentSessionId.value === sentSessionId) {
        rawMessages.value[rawMessages.value.length - 1].text = aiResponse;
        // 用户停在底部时跟随滚动；翻看历史时不打扰
        if (isNearBottom.value) scrollToBottom(false);
      }
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      ElMessage.error("消息发送失败，请重试");
      rawMessages.value.push({
        type: "AI",
        text: "消息发送失败，请重试",
        toolExecutionRequests: [],
        attributes: {},
        timestamp: new Date(),
      });
    }
  } finally {
    isLoading.value = false;
    streamingSessionId.value = null;
    streamController = null;
    if (currentSessionId.value === sentSessionId) {
      // 会话名可能被后端更新，延迟刷新列表
      setTimeout(() => loadSessions(), 800);
      await nextTick();
      inputRef.value?.focus();
    }
  }
};

// 处理键盘事件（中文输入法组词期间的回车不发送）
const handleKeyPress = (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// 输入框自适应高度（上限 160px）
const autoResize = () => {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
};

watch(inputMessage, autoResize);

// 点击消息内容：点到代码块时复制整段代码
const onMessageClick = (e) => {
  const pre = e.target.closest("pre");
  if (!pre) return;
  const text = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
  navigator.clipboard?.writeText(text).then(() => {
    pre.classList.add("copied");
    setTimeout(() => pre.classList.remove("copied"), 1600);
  });
};

// Esc 关闭移动端会话抽屉
const onGlobalKeydown = (e) => {
  if (e.key === "Escape") sidebarOpen.value = false;
};

// 组件挂载时加载会话列表
onMounted(() => {
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
  window.addEventListener("keydown", onGlobalKeydown);
  loadSessions();
});

onUnmounted(() => {
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  window.removeEventListener("keydown", onGlobalKeydown);
  abortActiveStream();
});
</script>

<style lang="scss" scoped>
/* ========== CSS 变量映射 Element Plus 主题 ========== */
.chat-page {
  --chat-primary: var(--el-color-primary);
  --chat-primary-light: var(--el-color-primary-light-3);
  --chat-primary-dark: var(--el-color-primary-dark-2);
  --chat-primary-soft: var(--el-color-primary-light-9);
  --chat-bg: var(--bg-page);
  --chat-border: var(--border-light);
  --chat-text: var(--text-primary);
  --chat-text-secondary: var(--text-secondary);
  --chat-white: var(--bg-card);
  --chat-shadow: var(--shadow-md);
  --chat-radius: 10px;
  --chat-code-block-bg: #1f1e24;
  --chat-code-block-text: #e8e6e3;

  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--chat-bg);
  color: var(--chat-text);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 300px;
  background: var(--chat-white);
  border-right: 1px solid var(--chat-border);
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 10;
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
}

.brand-logo {
  box-shadow: var(--glow-primary);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-title {
  font-size: 17px;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-sub {
  font-size: 12px;
  color: var(--chat-text-secondary);
  margin-top: 3px;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px 14px;
  border-bottom: 1px solid var(--chat-border);
}

.home-btn {
  color: var(--chat-text-secondary);
  font-size: 14px;
  font-weight: 500;
  padding: 7px 10px;
  border-radius: var(--chat-radius);
  transition: all 0.2s;
}

.home-btn:hover {
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
}

.new-chat-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(204, 120, 92, 0.25);
}

.new-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(204, 120, 92, 0.38);
}

.new-chat-btn:active {
  transform: translateY(0);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px;
  position: relative;
}

/* 会话增删时的无缝过渡 */
.session-enter-active,
.session-leave-active,
.session-move {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.session-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.session-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.session-leave-active {
  position: absolute;
  left: 12px;
  right: 12px;
}

.session-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  margin-bottom: 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.session-icon {
  color: var(--chat-text-secondary);
  flex-shrink: 0;
  transition: color 0.2s;
}

.session-item:hover {
  background: var(--chat-primary-soft);
}

.session-item:hover .session-icon,
.session-item:hover .session-name {
  color: var(--chat-primary);
}

.session-item.active {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-dark) 100%
  );
  color: #fff;
  box-shadow: 0 6px 18px rgba(204, 120, 92, 0.32);
}

.session-item.active .session-icon {
  color: #fff;
}

.session-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  transition: color 0.2s;
}

.session-item.active .session-name {
  color: #fff;
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--chat-text-secondary);
  opacity: 0;
  transition: all 0.2s;
  border-radius: 6px;
  flex-shrink: 0;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.session-item.active .delete-btn {
  opacity: 1;
  color: rgba(255, 255, 255, 0.8);
}

// 触屏设备没有 hover：保持删除按钮可见
@media (hover: none) {
  .delete-btn {
    opacity: 0.55;
  }
}

.delete-btn:hover {
  color: var(--el-color-danger) !important;
  background: var(--el-color-danger-light-9);
}

.session-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  color: var(--chat-text-secondary);
}

.session-empty p {
  margin: 0;
  font-size: 13px;
}

/* ========== 主聊天区域 ========== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--chat-bg);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* 欢迎页 */
.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 40px 24px;
  background: radial-gradient(
    ellipse 60% 50% at 50% 38%,
    var(--chat-primary-soft) 0%,
    transparent 70%
  );
}

.welcome-logo {
  margin-bottom: 22px;
  animation: float 4s ease-in-out infinite;
}

.welcome-logo :deep(.el-avatar) {
  box-shadow: 0 12px 34px rgba(204, 120, 92, 0.35);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.welcome-screen h1 {
  font-size: 34px;
  font-weight: 700;
  margin: 0 0 14px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-screen p {
  font-size: 15px;
  color: var(--chat-text-secondary);
  margin: 0 0 30px;
  max-width: 420px;
  line-height: 1.7;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 34px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 8px 24px rgba(204, 120, 92, 0.35);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(204, 120, 92, 0.45);
}

.start-btn:active {
  transform: translateY(0);
}

.suggestions {
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  max-width: 520px;
}

.suggestions-label {
  font-size: 13px;
  color: var(--chat-text-secondary);
}

.suggestion-chip {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-chip:hover {
  border-color: var(--chat-primary-light);
  background: var(--chat-white);
  transform: translateY(-1px);
}

/* 聊天容器 */
.chat-container {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--chat-bg);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--chat-border);
  background: color-mix(in srgb, var(--chat-white) 78%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  flex-shrink: 0;
  z-index: 2;
}

.chat-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.chat-header-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header-meta h3 {
  margin: 0;
  color: var(--chat-text);
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--chat-text-secondary);
  margin-top: 3px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-success);
  flex-shrink: 0;
}

.status-dot.loading {
  background: var(--chat-primary);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.7);
  }
}

.header-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  font-size: 13px;
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.header-new-btn:hover {
  border-color: var(--chat-primary-light);
  background: var(--chat-white);
}

/* ========== 消息列表 ========== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 28px 20px;
  scroll-behavior: smooth;
}

.messages-inner {
  max-width: 820px;
  margin: 0 auto;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
  animation: fadeInUp 0.35s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  margin-top: 20px;
}

.message-avatar :deep(.el-avatar) {
  width: 38px;
  height: 38px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-body {
  display: flex;
  flex-direction: column;
  max-width: 72%;
  min-width: 0;
}

.user-message .message-body {
  align-items: flex-end;
}

.message-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
  padding: 0 4px;
}

.message-sender {
  font-size: 12px;
  font-weight: 600;
  color: var(--chat-text-secondary);
}

.message-time {
  font-size: 11px;
  color: var(--text-placeholder, #b0aea9);
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: var(--chat-shadow);
  word-wrap: break-word;
}

.assistant-message .message-content {
  background: var(--chat-white);
  border-top-left-radius: 6px;
  border: 1px solid var(--chat-border);
}

.user-message .message-content {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border-top-right-radius: 6px;
}

.message-text {
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.message-text.markdown-body {
  white-space: normal;
}

/* Markdown 内容样式（v-html 内容需用 :deep） */
.markdown-body :deep(p) {
  margin: 0 0 0.75em;
  line-height: 1.75;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 1em 0 0.5em;
  font-weight: 700;
  line-height: 1.4;
}

.markdown-body :deep(h1) {
  font-size: 1.5em;
}

.markdown-body :deep(h2) {
  font-size: 1.32em;
}

.markdown-body :deep(h3) {
  font-size: 1.16em;
}

.markdown-body :deep(h4) {
  font-size: 1.05em;
}

.markdown-body :deep(h5) {
  font-size: 1em;
}

.markdown-body :deep(h6) {
  font-size: 0.92em;
  color: var(--chat-text-secondary);
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.6em;
  margin: 0.5em 0;
}

.markdown-body :deep(li) {
  margin: 0.3em 0;
  line-height: 1.7;
}

.markdown-body :deep(code) {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.9em;
  padding: 0.15em 0.4em;
  border-radius: 5px;
  background: var(--el-fill-color);
  color: var(--chat-primary-dark);
}

.markdown-body :deep(pre) {
  position: relative;
  margin: 0.85em 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--chat-code-block-bg);
  border: 1px solid var(--chat-border);
  overflow-x: auto;
}

// “复制”按钮：伪元素实现，点击事件由消息容器委托处理
.markdown-body :deep(pre::after) {
  content: "复制";
  position: absolute;
  top: 8px;
  right: 10px;
  padding: 3px 10px;
  font-size: 12px;
  color: #cfccc7;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  user-select: none;
}

.markdown-body :deep(pre:hover::after),
.markdown-body :deep(pre:focus-within::after) {
  opacity: 1;
}

.markdown-body :deep(pre.copied::after) {
  content: "已复制 ✓";
  opacity: 1;
  color: #86d9a4;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  color: var(--chat-code-block-text);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
}

.markdown-body :deep(blockquote) {
  margin: 0.85em 0;
  padding: 0.6em 1em;
  border-left: 3px solid var(--chat-primary);
  background: var(--chat-primary-soft);
  color: var(--chat-text-secondary);
  border-radius: 0 6px 6px 0;
}

.markdown-body :deep(a) {
  color: var(--chat-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.markdown-body :deep(a:hover) {
  border-bottom-color: currentColor;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--chat-border);
  margin: 1.1em 0;
}

.markdown-body :deep(strong) {
  font-weight: 700;
}

/* 流式输出的闪烁光标 */
.markdown-body.streaming::after {
  content: "▍";
  display: inline-block;
  margin-left: 2px;
  color: var(--chat-primary);
  animation: cursorBlink 1s steps(2) infinite;
}

@keyframes cursorBlink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

/* ========== 打字指示器 ========== */
.typing-indicator {
  display: flex;
  gap: 6px;
  padding: 8px 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--chat-primary);
  opacity: 0.5;
  animation: typingBounce 1.4s ease-in-out infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingBounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ========== 输入区域 ========== */
.input-area {
  position: relative;
  flex-shrink: 0;
  padding: 12px 20px 20px;
  background: linear-gradient(to top, var(--chat-bg) 60%, transparent 100%);
}

.input-box {
  max-width: 820px;
  margin: 0 auto;
  padding: 12px 14px 10px;
  background: var(--chat-white);
  border: 1px solid var(--chat-border);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  transition:
    border-color 0.25s,
    box-shadow 0.25s;
}

.input-box:focus-within {
  border-color: var(--chat-primary);
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.14);
}

.input-box textarea {
  width: 100%;
  padding: 2px 4px;
  border: none;
  border-radius: 0;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
  outline: none;
  background: transparent;
  color: var(--chat-text);
  min-height: 44px;
  max-height: 160px;
  overflow-y: auto;
}

.input-box textarea::placeholder {
  color: var(--text-placeholder, #b0aea9);
}

.input-box textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.input-hint {
  font-size: 12px;
  color: var(--text-placeholder, #b0aea9);
}

.send-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(204, 120, 92, 0.25);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(204, 120, 92, 0.38);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* ========== 回到底部按钮 ========== */
.back-bottom-btn {
  position: absolute;
  right: 34px;
  bottom: calc(100% + 12px);
  z-index: 5;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--chat-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--chat-primary);
  background: var(--chat-white);
  box-shadow: var(--shadow-lg);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.back-bottom-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--glow-primary);
}

.back-bottom-enter-active,
.back-bottom-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.back-bottom-enter-from,
.back-bottom-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ========== 移动端菜单按钮（会话抽屉） ========== */
.mobile-menu-btn {
  display: none;
}

.sidebar-backdrop {
  display: none;
}

/* ========== 滚动条 ========== */
.session-list::-webkit-scrollbar,
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-track,
.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color, #dcdfe6);
  border-radius: 10px;
}

.session-list::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker, #c0c4cc);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .sidebar {
    width: 240px;
  }

  .message-body {
    max-width: 80%;
  }
}

@media (max-width: 480px) {
  // 会话列表改为抽屉
  .sidebar {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-105%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-xl);
    z-index: 60;

    &.open {
      transform: translateX(0);
    }
  }

  .mobile-menu-btn {
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 55;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(
      135deg,
      var(--chat-primary) 0%,
      var(--chat-primary-light) 100%
    );
    box-shadow: 0 4px 14px rgba(204, 120, 92, 0.32);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 55;
    background: rgba(24, 23, 21, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  // 头部让出抽屉按钮位置
  .chat-header {
    padding: 10px 16px 10px 60px;
  }

  .chat-header-title {
    gap: 8px;

    // 隐藏头像避免与抽屉按钮重叠
    :deep(.el-avatar) {
      display: none;
    }
  }

  .header-new-btn {
    padding: 8px 12px;
    font-size: 12px;
  }

  .messages-container {
    padding: 18px 12px;
  }

  .message-body {
    max-width: 85%;
  }

  .input-area {
    padding: 10px 12px 14px;
  }

  .back-bottom-btn {
    right: 16px;
    bottom: calc(100% + 8px);
  }
}
</style>
