import { CloseMessageHandler } from "./handler/close";
import { EventMessageHandler } from "./handler/event";
import { MessageHandler } from "./handler";
import { ReqMessageHandler } from "./handler/req";
import { Filter, Event } from "nostr-tools";
import { Connection } from "../connection";
import { AuthMessageHandler } from "./handler/auth";

export class MessageHandlerFactory {
  static create(
    message: string,
    storeSubscription: (subscriptionId: string, filter: Filter) => void,
    getConnections: () => Map<WebSocket, Connection>,
  ): MessageHandler | undefined {
    try {
      const [type, idOrEvent, filter] = JSON.parse(message) as [
        string,
        string | Event,
        Filter,
      ];
      switch (type) {
        case "EVENT": {
          if (typeof idOrEvent !== "object") {
            return;
          }
          return new EventMessageHandler(idOrEvent, getConnections);
        }
        case "REQ": {
          if (typeof idOrEvent !== "string" || typeof filter !== "object") {
            return;
          }
          storeSubscription(idOrEvent, filter);
          return new ReqMessageHandler(idOrEvent, filter);
        }
        case "CLOSE": {
          if (typeof idOrEvent !== "string") {
            return;
          }
          return new CloseMessageHandler(idOrEvent, getConnections);
        }
        case "AUTH": {
          if (typeof idOrEvent !== "object") {
            return;
          }
          return new AuthMessageHandler(idOrEvent);
        }
        default: {
          return;
        }
      }
    } catch {
      return;
    }
  }
}
