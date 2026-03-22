import { Client } from "@stomp/stompjs";

let client = null;

export function connect(onMessage) {
  client = new Client({
    brokerURL: "ws://127.0.0.1:8081/ws",
    reconnectDelay: 5000,
    // 👇 加这个
    connectHeaders: {},

    // 👇 关键（让浏览器带 cookie）
    webSocketFactory: () => {
      return new WebSocket("ws://127.0.0.1:8081/ws");
    },
  });

  client.onConnect = () => {
    console.log("WebSocket连接成功");
    client.subscribe("/user/queue/msg", (message) => {
      onMessage(message.body);
    });
  };

  client.activate();
}

export function disconnect() {
  if (client) {
    client.deactivate();
    client = null;
    console.log("WebSocket已断开");
  }
}
