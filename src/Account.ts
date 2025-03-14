import { Bindings } from "./app";

type Data = {
  agreedAt: number;
};

export class Account {
  #pubkey: string;
  #env: Bindings;

  constructor(pubkey: string, env: Bindings) {
    this.#pubkey = pubkey;
    this.#env = env;
  }

  async exists(): Promise<boolean> {
    const data = await this.#env.accounts.get<Data>(this.#pubkey, "json");
    return data !== null;
  }

  async register(): Promise<void> {
    await this.#env.accounts.put(
      this.#pubkey,
      JSON.stringify({ agreedAt: Date.now() } satisfies Data),
    );
  }

  async unregister(): Promise<void> {
    await this.#env.accounts.delete(this.#pubkey);
  }
}
