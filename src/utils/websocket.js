import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { useUserStore } from "@/stores/user";

let stompClient = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimer = null;
let messageCallback = null;

function getReconnectDelay() {
  return Math.min(1000 * Math.pow(2, reconnectAttempts), 16000);
}

function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  if (!messageCallback) return;

  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    connect(messageCallback);
  }, getReconnectDelay());
}

export function connect(onMessage) {
  if (stompClient) return;

  messageCallback = onMessage;
  const userStore = useUserStore();
  const socket = new SockJS(import.meta.env.VITE_WS_URL);
  stompClient = Stomp.over(socket);
  stompClient.debug = null;

  // 配置心跳
  stompClient.heartbeat.outgoing = 20000;
  stompClient.heartbeat.incoming = 20000;

  stompClient.connect(
    { token: userStore.token.accessToken },
    () => {
      reconnectAttempts = 0;
      stompClient.subscribe("/user/queue/messages", (message) => {
        onMessage(message.body);
      });
    },
    () => {
      stompClient = null;
      attemptReconnect();
    },
  );
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  messageCallback = null;
  if (stompClient) {
    stompClient.disconnect(() => {});
    stompClient = null;
  }
}
