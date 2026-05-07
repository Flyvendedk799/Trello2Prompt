export class TrelloError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path?: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "TrelloError";
  }

  userMessage(): string {
    if (this.status === 401) {
      return "Trello token rejected. Regenerate it at trello.com/app-key and update .env.local.";
    }
    if (this.status === 404) {
      return "Trello resource not found. The board may have been deleted or your token may not have access.";
    }
    if (this.status === 429) {
      const retry = this.retryAfter ? ` Retry in ${this.retryAfter}s.` : "";
      return `Trello rate limit hit.${retry}`;
    }
    return `Trello request failed (${this.status}): ${this.message}`;
  }
}

export class MissingProviderKeyError extends Error {
  constructor(public readonly provider: string, public readonly envVar: string) {
    super(`Missing API key for provider "${provider}". Add ${envVar} to .env.local and restart the dev server.`);
    this.name = "MissingProviderKeyError";
  }
}

export class AIParseError extends Error {
  constructor(message: string, public readonly rawText?: string) {
    super(message);
    this.name = "AIParseError";
  }
}
