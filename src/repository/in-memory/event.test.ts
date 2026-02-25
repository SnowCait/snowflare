import { InMemoryEventRepository } from "./event";
import { testEventRepository } from "../event.test-template";

testEventRepository(
  "InMemory EventRepository",
  () => new InMemoryEventRepository(),
);
