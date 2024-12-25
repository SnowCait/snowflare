import { DurableObject } from "cloudflare:workers";

type Data = {
  agreedAt: number;
};

export class Register extends DurableObject {
  async has(pubkey: string): Promise<boolean> {
    const data = await this.ctx.storage.get<Data>(pubkey);
    return data !== undefined;
  }

  async set(pubkey: string): Promise<void> {
    await this.ctx.storage.put<Data>(pubkey, { agreedAt: Date.now() });
  }

  async delete(pubkey: string): Promise<void> {
    await this.ctx.storage.delete(pubkey);
  }
}
