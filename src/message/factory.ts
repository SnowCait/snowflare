import { CloseMessageHandler } from "./handler/close";
import { EventMessageHandler } from "./handler/event";
import { MessageHandler } from "./handler";
import { ReqMessageHandler } from "./handler/req";
import { Filter, Event } from "nostr-tools";
import { Subscriptions } from "../subscriptions";

export class MessageHandlerFactory {
  static create(
    message: string,
    storeSubscription: (subscriptionId: string, filter: Filter) => void,
    getSubscriptions: () => Map<WebSocket, Subscriptions>,
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
          return new EventMessageHandler(idOrEvent, getSubscriptions);
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
          return new CloseMessageHandler(idOrEvent, getSubscriptions);
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
