import { Event } from "nostr-tools";
import { config } from "./config";
import { normalizeURL } from "nostr-tools/utils";

export namespace Auth {
  export class Challenge {
    static generate(): string {
      return crypto.randomUUID();
    }

    static validate(event: Event, auth: Session, url: string): boolean {
      if (event.kind !== 22242) {
        return false;
      }
      if (auth.challengedAt + config.auth_timeout * 1000 < Date.now()) {
        return false;
      }
      const challenge = event.tags.find(([t]) => t === "challenge")?.at(1);
      if (challenge !== auth.challenge) {
        return false;
      }
      const relay = event.tags.find(([t]) => t === "relay")?.at(1);
      if (relay === undefined || normalizeURL(relay) !== normalizeURL(url)) {
        return false;
      }
      return true;
    }
  }

  export type Session = {
    challenge: string;
    challengedAt: number;
  };
}
