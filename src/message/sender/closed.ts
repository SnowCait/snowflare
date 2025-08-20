export function sendClosed(
  ws: WebSocket,
  subscriptionId: string,
  prefix: string,
  message: string,
): void {
  ws.send(JSON.stringify(["CLOSED", subscriptionId, `${prefix}: ${message}`]));
}
