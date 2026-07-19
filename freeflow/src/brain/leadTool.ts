import { ClientConfig } from "../config/types";

/** Builds the record_lead tool schema dynamically from the client's own
 * qualifying questions, so every trade gets a tailored structured output
 * without any code changes. */
export function buildLeadTool(config: ClientConfig) {
  const answerProps: Record<string, { type: string; description: string }> = {};
  for (const q of config.qualifyingQuestions) {
    answerProps[q.id] = { type: "string", description: q.ask };
  }

  return {
    name: "record_lead",
    description:
      "Records a structured lead once qualifying questions are answered, the customer is out of scope, or the request is an emergency.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerName: {
          type: "string",
          description: "The customer's name, if they gave it. Omit if unknown.",
        },
        answers: {
          type: "object",
          description: "Answers gathered so far, keyed by question id.",
          properties: answerProps,
        },
        isEmergency: {
          type: "boolean",
          description: "True if this is an urgent/emergency request per the config's emergency rules.",
        },
        transcriptSummary: {
          type: "string",
          description: "One or two sentence plain-English summary of the job for the owner.",
        },
      },
      required: ["answers", "isEmergency", "transcriptSummary"],
    },
  };
}
