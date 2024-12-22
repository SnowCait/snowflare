import { Auth } from "../../auth";

export function sendAuthChallenge(ws: WebSocket): string {
  const challenge = Auth.Challenge.generate();
  ws.send(JSON.stringify(["AUTH", challenge]));
  return challenge;
}
