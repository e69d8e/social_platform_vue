import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { useUserStore } from "@/stores/user";

let stompClient = null;

export function connect(onMessage) {
  if (stompClient) return;

  const userStore = useUserStore();
  const socket = new SockJS("http://127.0.0.1:8081/ws");
  stompClient = Stomp.over(socket);
  stompClient.debug = null; // 禁用 STOMP 调试日志

  stompClient.connect(
    { token: userStore.token.accessToken },
    () => {
      console.log("WebSocket连接成功");
      stompClient.subscribe("/user/queue/messages", (message) => {
        onMessage(message.body);
      });
    },
    () => {
      // 连接失败时清理，不再重试
      stompClient = null;
    },
  );
}

export function disconnect() {
  if (stompClient) {
    stompClient.disconnect(() => {});
    stompClient = null;
  }
}
