/** Shared types for client config, conversation, and leads. */

export interface QualifyingQuestion {
  id: string;
  ask: string;
}

/** Loaded from /clients/*.json. Either emergencyKeywords (trade with callouts)
 * or orderCutoffDays (order-based business like a bakery) will be present, not both. */
export interface ClientConfig {
  businessId: string;
  businessName: string;
  trade: string;
  ownerName: string;
  ownerWhatsApp: string;
  serviceArea: string[];
  hours: string;
  calloutFee: string;
  emergencyKeywords?: string[];
  orderCutoffDays?: number;
  qualifyingQuestions: QualifyingQuestion[];
  tone: string;
}

export interface StoredMessage {
  id: number;
  businessId: string;
  customerWhatsApp: string;
  direction: "inbound" | "outbound";
  text: string;
  photoRefs: string[];
  createdAt: string;
}

export interface Lead {
  id?: number;
  businessId: string;
  customerName?: string;
  customerWhatsApp: string;
  answers: Record<string, string>;
  isEmergency: boolean;
  photoRefs: string[];
  transcriptSummary: string;
  createdAt: string;
}
