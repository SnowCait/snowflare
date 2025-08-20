export function sendNotice(ws: WebSocket, message: string): void {
  ws.send(JSON.stringify(["NOTICE", message]));
}
