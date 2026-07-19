import { ClientConfig, Lead } from "../config/types";
import { getCurrentConversation, logMessage, saveLead } from "../db";
import { Channel } from "../channels/types";
import { askBrain } from "./claude";

/** Handles one inbound message end-to-end: logs it, asks the brain what to
 * say, replies to the customer, and — if qualification is done — saves the
 * lead and notifies the owner. This is channel-agnostic; WhatsApp and the
 * simulator both call this same function. */
export async function handleInboundMessage(
  config: ClientConfig,
  from: string,
  text: string,
  photoRefs: string[],
  customerChannel: Channel,
  ownerChannel: Channel
): Promise<void> {
  logMessage({
    businessId: config.businessId,
    customerWhatsApp: from,
    direction: "inbound",
    text,
    photoRefs,
  });

  const history = getCurrentConversation(config.businessId, from);
  const reply = await askBrain(config, history);

  if (reply.text) {
    await customerChannel.sendMessage(from, reply.text);
    logMessage({
      businessId: config.businessId,
      customerWhatsApp: from,
      direction: "outbound",
      text: reply.text,
      photoRefs: [],
    });
  }

  if (reply.lead) {
    // Backstop emergency detection: trust Claude's flag, but also catch an
    // obvious keyword match in case the model misses it.
    const keywordHit = (config.emergencyKeywords ?? []).some((kw) =>
      text.toLowerCase().includes(kw.toLowerCase())
    );
    const isEmergency = reply.lead.isEmergency || keywordHit;

    const allPhotoRefs = history.flatMap((m) => m.photoRefs).concat(photoRefs);

    const lead = saveLead({
      businessId: config.businessId,
      customerName: reply.lead.customerName,
      customerWhatsApp: from,
      answers: reply.lead.answers,
      isEmergency,
      photoRefs: allPhotoRefs,
      transcriptSummary: reply.lead.transcriptSummary,
    });

    await notifyOwner(config, lead, ownerChannel);
  }
}

async function notifyOwner(config: ClientConfig, lead: Lead, ownerChannel: Channel): Promise<void> {
  const suburb = lead.answers.suburb ?? lead.answers.location ?? "unknown area";
  const problemOneLiner = lead.transcriptSummary;
  const urgentTag = lead.isEmergency ? "URGENT ⚠️ " : "";

  const message =
    `🔔 New lead (${urgentTag}${suburb}) — ${problemOneLiner} — ${lead.customerWhatsApp}. ` +
    `Reply CALL to get a click-to-call link.`;

  await ownerChannel.sendMessage(config.ownerWhatsApp, message);
}
