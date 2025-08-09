// LLM abstraction layer
export interface LLMRequest {
  prompt: string;
  temperature?: number;
  system?: string;
}

export interface LLMResponse {
  text: string;
  raw?: any;
}

export interface LLMClient {
  name(): string;
  send(req: LLMRequest): Promise<LLMResponse>;
}

export class LLMRegistry {
  private static inst: LLMRegistry;
  private impls = new Map<string, LLMClient>();
  static instance() { return this.inst ??= new LLMRegistry(); }
  register(client: LLMClient) { this.impls.set(client.name(), client); }
  get(name: string) { return this.impls.get(name); }
  getDefault() { return this.impls.values().next().value as LLMClient | undefined; }
  list() { return [...this.impls.keys()]; }
}
