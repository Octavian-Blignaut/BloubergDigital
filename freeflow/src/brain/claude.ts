import Anthropic from "@anthropic-ai/sdk";
import { ClientConfig, StoredMessage } from "../config/types";
import { buildSystemPrompt } from "./systemPrompt";
import { buildLeadTool } from "./leadTool";

const CLAUDE_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set — check your .env file");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface BrainReply {
  /** Text to send back to the customer, if any. */
  text?: string;
  /** Present when Claude decided qualification is complete (or out of scope / emergency). */
  lead?: {
    customerName?: string;
    answers: Record<string, string>;
    isEmergency: boolean;
    transcriptSummary: string;
  };
}

/** Runs one turn of the conversation: given history + the new inbound
 * message, asks Claude what to say next and whether to record a lead. */
export async function askBrain(
  config: ClientConfig,
  history: StoredMessage[]
): Promise<BrainReply> {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content:
      m.photoRefs.length > 0
        ? `${m.text}\n[customer attached ${m.photoRefs.length} photo(s): ${m.photoRefs.join(", ")}]`
        : m.text,
  }));

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(config),
    tools: [buildLeadTool(config)],
    messages,
  });

  const reply: BrainReply = {};

  for (const block of response.content) {
    if (block.type === "text" && block.text.trim()) {
      reply.text = (reply.text ? reply.text + "\n" : "") + block.text.trim();
    }
    if (block.type === "tool_use" && block.name === "record_lead") {
      const input = block.input as {
        customerName?: string;
        answers: Record<string, string>;
        isEmergency: boolean;
        transcriptSummary: string;
      };
      reply.lead = input;
    }
  }

  return reply;
}
