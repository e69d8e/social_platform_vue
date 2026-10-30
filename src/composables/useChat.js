import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import {
  getMessageHistoryApi,
  sendMessageApi,
  markReadApi,
  getConversationsApi,
} from "@/api/messageApi";
import { getUserInfoByIdApi } from "@/api/userApi";
import { connect, disconnect } from "@/utils/websocket";
import { ElMessage } from "element-plus";
import { CHAT_PAGE_SIZE } from "@/constants/pagination";

/**
 * 私信对话逻辑：历史消息分页加载（上翻锚点保持）、乐观发送与失败重试、
 * WebSocket 实时接收、已读上报、新会话接管。
 *
 * @param {Object} options
 * @param {() => { container: HTMLElement, endAnchor: HTMLElement }} [options.messagesAreaRef]
 *   消息区组件实例的模板 ref（ChatMessages 暴露 container / endAnchor）
 */
export function useChat({ messagesAreaRef } = {}) {
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();

  const messages = ref([]);
  const inputMessage = ref("");
  const sending = ref(false);
  const loadingHistory = ref(false);
  const historyError = ref(false);
  const historyFinished = ref(false);
  const appendingOld = ref(false);
  const isNearBottom = ref(true);
  const pageNum = ref(1);
  const pageSize = CHAT_PAGE_SIZE;

  const conversationId = ref(route.params.conversationId);
  const isNewChat = ref(conversationId.value === "new");
  const receiverId = ref(route.query.receiverId || "");

  // 首屏消息条数：老消息上翻加载后保持「新消息」动画边界不漂移
  const firstPageCount = ref(0);

  // 触屏设备上 Enter 应换行，发送交给按钮（软键盘没有 Shift）
  const isTouchDevice =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none)").matches;

  const otherUser = ref({ nickname: "", avatar: "" });

  const getContainer = () => messagesAreaRef?.value?.container;

  const scrollToBottom = async (behavior = "smooth") => {
    const anchor = messagesAreaRef?.value?.endAnchor;
    if (!anchor) return;
    await nextTick();
    anchor.scrollIntoView({ behavior });
  };

  const loadHistory = async () => {
    if (isNewChat.value || loadingHistory.value || historyFinished.value)
      return;
    loadingHistory.value = true;
    historyError.value = false;
    try {
      const res = await getMessageHistoryApi(conversationId.value, {
        pageNum: pageNum.value,
        pageSize,
      });
      if (res.data.code === 1) {
        const list = res.data.data || [];
        const reversed = list.reverse();
        if (pageNum.value === 1) {
          messages.value = reversed;
          firstPageCount.value = reversed.length;
          await scrollToBottom("auto");
        } else {
          const container = getContainer();
          const oldScrollHeight = container?.scrollHeight || 0;
          firstPageCount.value += reversed.length;
          appendingOld.value = true;
          messages.value = [...reversed, ...messages.value];
          await nextTick();
          if (container) {
            container.scrollTop = container.scrollHeight - oldScrollHeight;
          }
          appendingOld.value = false;
        }
        if (list.length < pageSize) {
          historyFinished.value = true;
        } else {
          pageNum.value++;
        }
      } else {
        historyError.value = true;
      }
    } catch {
      historyError.value = true;
    } finally {
      loadingHistory.value = false;
    }
  };

  const retryHistory = () => {
    historyError.value = false;
    loadHistory();
  };

  const loadOtherUserInfo = async () => {
    if (!receiverId.value) return;
    try {
      const res = await getUserInfoByIdApi(receiverId.value);
      if (res.data.code === 1) {
        otherUser.value = {
          nickname: res.data.data.nickname,
          avatar: res.data.data.avatar,
        };
      }
    } catch {
      // silently fail
    }
  };

  const markAsRead = async () => {
    if (isNewChat.value) return;
    try {
      await markReadApi(conversationId.value);
    } catch {
      // silently fail
    }
  };

  // 新聊天发出第一条消息后：把当前页「接管」为真实会话，
  // 用户留在对话里继续聊，而不是被踢回会话列表
  const adoptConversation = async () => {
    try {
      const convRes = await getConversationsApi({
        pageNum: 1,
        pageSize: CHAT_PAGE_SIZE,
      });
      const payload = convRes.data.data;
      const convs = Array.isArray(payload) ? payload : payload?.list || [];
      const hit = convs.find(
        (c) => String(c.otherUserId) === String(receiverId.value),
      );
      if (!hit?.conversationId) return;
      conversationId.value = hit.conversationId;
      isNewChat.value = false;
      await loadHistory();
      markAsRead();
      connect(onWsMessage);
      router.replace({
        path: `/chat/${hit.conversationId}`,
        query: { receiverId: receiverId.value },
      });
    } catch {
      // 会话接管失败不影响消息已送达，保持当前界面
    }
  };

  // App.vue 对 /chat 路由共用 key（避免接管时重挂载白屏），组件实例会跨
  // /chat/:id 复用：接管流程先更新 conversationId 再 replace，此处无需处理；
  // 但直接改 URL 在会话间跳转时仍需整体重置状态，防止显示错会话的消息。
  watch(
    () => route.params.conversationId,
    async (next) => {
      if (next === undefined || String(next) === String(conversationId.value)) {
        return;
      }
      disconnect();
      conversationId.value = next;
      isNewChat.value = next === "new";
      messages.value = [];
      pageNum.value = 1;
      historyFinished.value = false;
      isNearBottom.value = true;
      firstPageCount.value = 0;
      await loadOtherUserInfo();
      await loadHistory();
      markAsRead();
      if (!isNewChat.value) {
        connect(onWsMessage);
      }
    },
  );

  const deliver = async (msg) => {
    try {
      const res = await sendMessageApi({
        receiverId: receiverId.value,
        content: msg.content,
      });
      if (res.data.code === 1) {
        msg.status = "sent";
        if (res.data.data?.id) msg.id = res.data.data.id;
        if (isNewChat.value) await adoptConversation();
      } else {
        msg.status = "failed";
        ElMessage.error(res.data.message || "发送失败");
      }
    } catch {
      msg.status = "failed";
      ElMessage.error("发送失败，请重试");
    }
  };

  const sendMessage = async () => {
    const content = inputMessage.value.trim();
    if (!content || sending.value) return;

    sending.value = true;
    inputMessage.value = "";

    // 乐观更新：立即将消息推入界面，无需等待并重拉整个列表
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const tempMsg = {
      id: `temp_${Date.now()}`,
      senderId: userStore.userInfo.id,
      content,
      createTime: timeStr,
      status: "sending",
    };
    messages.value.push(tempMsg);
    scrollToBottom("smooth");
    await deliver(tempMsg);
    sending.value = false;
  };

  const retryMessage = async (msg) => {
    if (msg.status !== "failed" || msg.retrying) return;
    msg.retrying = true;
    msg.status = "sending";
    await deliver(msg);
    msg.retrying = false;
  };

  const onWsMessage = (body) => {
    try {
      const data = JSON.parse(body);
      // 判断消息是否来自当前聊天对象
      if (data.senderId + "" === receiverId.value + "") {
        messages.value.push({
          id: data.id,
          senderId: data.senderId,
          content: data.content,
          createTime: data.createTime,
          status: "sent",
        });
        if (isNearBottom.value) {
          scrollToBottom();
        }
        markAsRead();
      }
    } catch {
      // ignore
    }
  };

  // ChatMessages 滚动回调：跟随底部状态 + 触顶加载历史
  const handleAreaScroll = ({ nearBottom, atTop }) => {
    isNearBottom.value = nearBottom;
    if (atTop) loadHistory();
  };

  const copyMessage = (text) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        ElMessage.success("已复制到剪贴板");
      },
      () => {
        ElMessage.error("复制失败");
      },
    );
  };

  onMounted(async () => {
    await loadOtherUserInfo();
    await loadHistory();
    await markAsRead();
    if (!isNewChat.value) {
      connect(onWsMessage);
    }
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    // state
    messages,
    inputMessage,
    sending,
    loadingHistory,
    historyError,
    appendingOld,
    isNearBottom,
    firstPageCount,
    conversationId,
    isNewChat,
    receiverId,
    otherUser,
    isTouchDevice,
    // actions
    scrollToBottom,
    retryHistory,
    sendMessage,
    retryMessage,
    handleAreaScroll,
    copyMessage,
  };
}
