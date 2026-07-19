import { Channel } from "./types";

/** In-memory outbound queue keyed by customer WhatsApp number, so the /demo
 * web page can poll for new messages from the brain (including the owner
 * notification, which we log to console since there's no real owner phone). */
const outboundQueues = new Map<string, string[]>();

export class SimulatorChannel implements Channel {
  async sendMessage(to: string, text: string): Promise<void> {
    const queue = outboundQueues.get(to) ?? [];
    queue.push(text);
    outboundQueues.set(to, queue);
  }
}

/** Drains and returns any queued outbound messages for a customer (used by the demo page's poll endpoint). */
export function drainOutbound(to: string): string[] {
  const queue = outboundQueues.get(to) ?? [];
  outboundQueues.set(to, []);
  return queue;
}

/** Sends the "owner" a WhatsApp message. In simulator mode there's no real
 * owner phone, so we just log it clearly to the console. */
export class SimulatedOwnerChannel implements Channel {
  async sendMessage(to: string, text: string): Promise<void> {
    console.log(`\n📱 [Owner WhatsApp → ${to}]\n${text}\n`);
  }
}
