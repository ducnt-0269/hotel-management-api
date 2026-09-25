// Mailpit is the SMTP sink in docker-compose and in CI; its HTTP API is how
// the e2e suite proves a mail actually went out.
const BASE_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

export interface MailpitMessage {
  Subject: string;
  Text: string;
  HTML: string;
}

export async function clearMailbox(): Promise<void> {
  await fetch(`${BASE_URL}/api/v1/messages`, { method: 'DELETE' });
}

export async function countMail(to: string): Promise<number> {
  const query = encodeURIComponent(`to:${to}`);
  const found = (await (
    await fetch(`${BASE_URL}/api/v1/search?query=${query}`)
  ).json()) as { messages_count: number };
  return found.messages_count;
}

// Polls rather than sleeps: the mail crosses Redis → worker → SMTP → Mailpit.
export async function waitForMail(
  to: string,
  timeoutMs = 10_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const query = encodeURIComponent(`to:${to}`);
    const found = (await (
      await fetch(`${BASE_URL}/api/v1/search?query=${query}`)
    ).json()) as { messages: { ID: string }[] };

    const id = found.messages?.[0]?.ID;
    if (id) {
      return (await (
        await fetch(`${BASE_URL}/api/v1/message/${id}`)
      ).json()) as MailpitMessage;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`No mail for ${to} within ${timeoutMs}ms`);
}
