import express from "express";
import path from "path";
import dotenv from "dotenv";
import { listClientIds, loadClientConfig } from "../config/loader";
import { handleInboundMessage } from "../brain/conversationEngine";
import { SimulatorChannel, SimulatedOwnerChannel, drainOutbound } from "../channels/simulator";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "..", "public")));

const customerChannel = new SimulatorChannel();
const ownerChannel = new SimulatedOwnerChannel();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/demo", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "public", "demo.html"));
});

/** Lists available demo clients for the picker dropdown. */
app.get("/demo/clients", (_req, res) => {
  res.json(listClientIds());
});

/** Customer sends a message in the demo chat UI. */
app.post("/demo/message", async (req, res) => {
  try {
    const { businessId, from, text } = req.body as {
      businessId: string;
      from: string;
      text: string;
    };
    if (!businessId || !from || !text) {
      res.status(400).json({ error: "businessId, from, and text are required" });
      return;
    }
    const config = loadClientConfig(businessId);
    // Fire and respond immediately; the demo page polls for the reply so the
    // UI doesn't block on the Claude round-trip.
    handleInboundMessage(config, from, text, [], customerChannel, ownerChannel).catch((err) =>
      console.error("Error handling inbound demo message:", err)
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** Demo page polls this to pick up the assistant's replies. */
app.get("/demo/poll", (req, res) => {
  const from = String(req.query.from ?? "");
  res.json({ messages: drainOutbound(from) });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Receptionist running at http://localhost:${PORT}/demo`);
});
