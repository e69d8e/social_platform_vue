import { ref, computed, nextTick } from "vue";
import {
  createSessionApi,
  deleteSessionApi,
  getSessionApi,
  getSessionContentApi,
} from "@/api/aiApi";
import { ElMessage, ElMessageBox } from "element-plus";
import { baseURL } from "@/utils/request";
import { authFetch } from "@/utils/authFetch";
import { AI_SESSION_PAGE_SIZE } from "@/constants/pagination";

/**
 * AI 助手对话逻辑：会话列表分页、会话切换、流式发送（SSE）、
 * 中断生成、建议问题直发。
 *
 * @param {Object} options
 * @param {() => { scrollToBottom: (smooth?: boolean) => void }} [options.messagesListRef]
 *   消息区组件实例的模板 ref（AiMessageList 暴露 scrollToBottom）
 * @param {() => { focus: () => void }} [options.inputRef]
 *   输入框组件实例的模板 ref（AiChatInput 暴露 focus）
 */
export function useAiChat({ messagesListRef, inputRef } = {}) {
  // ============ 响应式数据 ============
  const sessions = ref([]);
  const currentSessionId = ref(null);
  const rawMessages = ref([]); // 存储原始消息数据
  const inputMessage = ref("");
  const isLoading = ref(false);
  const currentPage = ref(1);
  const pageSize = AI_SESSION_PAGE_SIZE;

  const suggestions = [
    "🔥 社区最近有什么热门讨论和帖子？",
    "📷 推荐几位摄影或数码领域的创作者",
    "✍️ 帮我写一篇关于周末生活的发帖草稿",
    "🤖 社区里大家都在讨论哪些 AI 或科技话题？",
  ];

  // 是否停留在底部附近（决定流式输出时是否自动跟随滚动）
  const isNearBottom = ref(true);
  // 移动端会话抽屉
  const sidebarOpen = ref(false);
  // 正在流式输出的会话id（isLoading 可能属于已切走的会话）
  const streamingSessionId = ref(null);
  let streamController = null;

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
    () =>
      isLoading.value && streamingSessionId.value === currentSessionId.value,
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
    messagesListRef?.value?.scrollToBottom(smooth);
  };

  // 消息区滚动回调：更新「是否停在底部」状态
  const handleMessagesScroll = (nearBottom) => {
    isNearBottom.value = nearBottom;
  };

  const jumpToBottom = () => {
    isNearBottom.value = true;
    scrollToBottom(true);
  };

  // ---------- 会话列表 ----------
  // 加载会话列表（append=false 时替换，用于删除/重命名后的刷新）
  const sessionsFinished = ref(false);
  const sessionsLoading = ref(false);
  const loadSessions = async (append = false) => {
    if (sessionsLoading.value) return;
    sessionsLoading.value = true;
    try {
      const res = await getSessionApi(currentPage.value, pageSize);
      if (res.data.code === 1) {
        const list = res.data.data || [];
        sessions.value = append ? [...sessions.value, ...list] : list;
        sessionsFinished.value = list.length < pageSize;
      }
    } catch (error) {
      console.error("加载会话列表失败:", error);
      ElMessage.error("加载会话列表失败");
    } finally {
      sessionsLoading.value = false;
    }
  };

  const loadMoreSessions = async () => {
    if (sessionsFinished.value) return;
    currentPage.value += 1;
    await loadSessions(true);
  };

  // 创建新会话（回复期间不允许新建，避免流式数据串台）
  const refreshSessions = async () => {
    currentPage.value = 1;
    sessionsFinished.value = false;
    await loadSessions(false);
  };

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
        await refreshSessions();
        // 聚焦到输入框
        await nextTick();
        inputRef?.value?.focus();
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
        await refreshSessions();
        ElMessage.success("会话已删除");
      }
    } catch (error) {
      console.error("删除会话失败:", error);
      ElMessage.error("删除会话失败");
    }
  };

  // ---------- 发送与流式接收 ----------
  const sendMessage = async () => {
    const content = inputMessage.value.trim();
    if (!content || isLoading.value) return;

    // 先保存用户输入，再清空输入框（建会话失败时回填）
    inputMessage.value = "";
    isNearBottom.value = true;

    // 如果没有会话，先创建会话
    if (!currentSessionId.value) {
      try {
        const res = await createSessionApi();
        if (res.data.code === 1) {
          currentSessionId.value = res.data.data;
          await refreshSessions();
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
          memoryId: sentSessionId,
          content,
        }),
      });

      // 出错时后端返回 JSON（如会话不存在/无权访问），不能把错误 JSON 当流渲染进气泡
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("text/stream")) {
        let message = "消息发送失败，请重试";
        try {
          const err = await response.json();
          message = err.message || message;
        } catch {
          // 非 JSON 响应，用默认提示
        }
        ElMessage.error(message);
        rawMessages.value.push({
          type: "AI",
          text: message,
          toolExecutionRequests: [],
          attributes: {},
          timestamp: new Date(),
        });
        return;
      }

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
        setTimeout(() => refreshSessions(), 800);
        await nextTick();
        inputRef?.value?.focus();
      }
    }
  };

  return {
    // state
    sessions,
    currentSessionId,
    inputMessage,
    isLoading,
    suggestions,
    isNearBottom,
    sidebarOpen,
    sessionsLoading,
    sessionsFinished,
    // computed
    displayMessages,
    currentSessionName,
    isStreamingHere,
    showTyping,
    // actions
    jumpToBottom,
    loadSessions,
    loadMoreSessions,
    createNewSession,
    useSuggestion,
    selectSession,
    deleteSession,
    sendMessage,
    abortActiveStream,
    handleMessagesScroll,
  };
}
