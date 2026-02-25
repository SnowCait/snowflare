import { describe, expect, it } from "vitest";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "nostr-tools/pure";
import { RequestToVanish } from "../nostr";
import { EventRepository } from "./event";
import { GiftWrap, ShortTextNote } from "nostr-tools/kinds";

export function testEventRepository(
  name: string,
  createRepository: () => EventRepository,
): void {
  describe(name, () => {
    const seckey = generateSecretKey();

    it("vanishBy should only delete author events with created_at less than or equal to the given event", async () => {
      // Arrange
      const event1 = finalizeEvent(
        {
          kind: ShortTextNote,
          tags: [],
          content: "Event 1",
          created_at: 0,
        },
        seckey,
      );
      const event2 = finalizeEvent(
        {
          kind: ShortTextNote,
          tags: [],
          content: "Event 2",
          created_at: 2,
        },
        seckey,
      );

      const repository = createRepository();
      await repository.save(event1, null);
      await repository.save(event2, null);

      // Act
      const vanishEvent = finalizeEvent(
        {
          kind: RequestToVanish,
          tags: [["relay", "ALL_RELAYS"]],
          content: "",
          created_at: 1,
        },
        seckey,
      );
      await repository.vanishBy(vanishEvent);

      // Assert
      const remainingEvents = await repository.find({ kinds: [1] });
      expect(remainingEvents).toEqual([event2]);
    });

    it("vanishBy should delete gift-wrapped events which are tagged with author", async () => {
      // Arrange
      const seckey2 = generateSecretKey();
      const event1 = finalizeEvent(
        {
          kind: GiftWrap,
          tags: [["p", getPublicKey(seckey)]],
          content: "",
          created_at: 0,
        },
        seckey2,
      );
      const event2 = finalizeEvent(
        {
          kind: GiftWrap,
          tags: [["p", getPublicKey(seckey2)]],
          content: "",
          created_at: 0,
        },
        seckey2,
      );

      const repository = createRepository();
      await repository.save(event1, null);
      await repository.save(event2, null);

      // Act
      const vanishEvent = finalizeEvent(
        {
          kind: RequestToVanish,
          tags: [["relay", "ALL_RELAYS"]],
          content: "",
          created_at: 1,
        },
        seckey,
      );
      await repository.vanishBy(vanishEvent);

      // Assert
      const remainingEvents = await repository.find({
        kinds: [GiftWrap],
      });
      expect(remainingEvents).toEqual([event2]);
    });
  });
}
