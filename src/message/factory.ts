import { NostrEvent } from "nostr-tools/core";
import { Filter } from "nostr-tools/filter";
import { MessageHandler } from "./handler";
import { EventMessageHandler } from "./handler/event";
import { ReqMessageHandler } from "./handler/req";
import { CloseMessageHandler } from "./handler/close";
import { AuthMessageHandler } from "./handler/auth";
import { EventRepository } from "../repository/event";

export class MessageHandlerFactory {
  static create(
    message: string,
    eventsRepository: EventRepository,
  ): MessageHandler | undefined {
    try {
      const [type, idOrEvent, ...filters] = JSON.parse(message) as [
        string,
        string | NostrEvent,
        Filter,
      ];
      switch (type) {
        case "EVENT": {
          if (typeof idOrEvent !== "object") {
            return;
          }
          return new EventMessageHandler(idOrEvent, eventsRepository);
        }
        case "REQ": {
          if (
            typeof idOrEvent !== "string" ||
            filters.length < 1 ||
            filters.some((filter) => typeof filter !== "object")
          ) {
            return;
          }
          return new ReqMessageHandler(idOrEvent, filters, eventsRepository);
        }
        case "CLOSE": {
          if (typeof idOrEvent !== "string") {
            return;
          }
          return new CloseMessageHandler(idOrEvent);
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
