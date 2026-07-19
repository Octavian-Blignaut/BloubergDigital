/** Every channel (WhatsApp, simulator, future channels) implements this so
 * the brain never knows or cares which transport it's running on. */
export interface Channel {
  /** Sends a plain text message to a customer. */
  sendMessage(to: string, text: string): Promise<void>;
}

/** Shape of an inbound message, regardless of which channel it arrived on. */
export interface InboundMessage {
  businessId: string;
  from: string;
  text: string;
  photoRefs: string[];
}
