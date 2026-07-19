import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { Lead, StoredMessage } from "../config/types";

const DB_PATH = path.join(__dirname, "..", "..", "receptionist.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

let db: Database.Database | null = null;

/** Lazily opens the single SQLite file and applies schema on first use. */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));
  }
  return db;
}

/** A conversation resets after 24h of silence between customer and business. */
const SESSION_GAP_MS = 24 * 60 * 60 * 1000;

export function logMessage(entry: Omit<StoredMessage, "id" | "createdAt">): void {
  const stmt = getDb().prepare(
    `INSERT INTO messages (businessId, customerWhatsApp, direction, text, photoRefs, createdAt)
     VALUES (@businessId, @customerWhatsApp, @direction, @text, @photoRefs, @createdAt)`
  );
  stmt.run({
    businessId: entry.businessId,
    customerWhatsApp: entry.customerWhatsApp,
    direction: entry.direction,
    text: entry.text,
    photoRefs: JSON.stringify(entry.photoRefs ?? []),
    createdAt: new Date().toISOString(),
  });
}

/** Returns messages for the current conversation only — i.e. since the last
 * gap of 24h+ silence, so old resolved conversations don't leak into a new one. */
export function getCurrentConversation(
  businessId: string,
  customerWhatsApp: string
): StoredMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM messages
       WHERE businessId = ? AND customerWhatsApp = ?
       ORDER BY createdAt ASC`
    )
    .all(businessId, customerWhatsApp) as any[];

  if (rows.length === 0) return [];

  // Walk backwards from the end, stop at the first gap >= 24h.
  let startIndex = rows.length - 1;
  for (let i = rows.length - 1; i > 0; i--) {
    const gap = Date.parse(rows[i].createdAt) - Date.parse(rows[i - 1].createdAt);
    if (gap >= SESSION_GAP_MS) {
      startIndex = i;
      break;
    }
    startIndex = 0;
  }

  return rows.slice(startIndex).map(rowToMessage);
}

function rowToMessage(row: any): StoredMessage {
  return {
    id: row.id,
    businessId: row.businessId,
    customerWhatsApp: row.customerWhatsApp,
    direction: row.direction,
    text: row.text,
    photoRefs: JSON.parse(row.photoRefs || "[]"),
    createdAt: row.createdAt,
  };
}

export function saveLead(lead: Omit<Lead, "id" | "createdAt">): Lead {
  const createdAt = new Date().toISOString();
  const stmt = getDb().prepare(
    `INSERT INTO leads (businessId, customerName, customerWhatsApp, answers, isEmergency, photoRefs, transcriptSummary, createdAt)
     VALUES (@businessId, @customerName, @customerWhatsApp, @answers, @isEmergency, @photoRefs, @transcriptSummary, @createdAt)`
  );
  const info = stmt.run({
    businessId: lead.businessId,
    customerName: lead.customerName ?? null,
    customerWhatsApp: lead.customerWhatsApp,
    answers: JSON.stringify(lead.answers),
    isEmergency: lead.isEmergency ? 1 : 0,
    photoRefs: JSON.stringify(lead.photoRefs ?? []),
    transcriptSummary: lead.transcriptSummary,
    createdAt,
  });
  return { ...lead, id: Number(info.lastInsertRowid), createdAt };
}

export function listLeads(businessId?: string): Lead[] {
  const rows = businessId
    ? getDb()
        .prepare(`SELECT * FROM leads WHERE businessId = ? ORDER BY createdAt DESC`)
        .all(businessId)
    : getDb().prepare(`SELECT * FROM leads ORDER BY createdAt DESC`).all();
  return (rows as any[]).map((row) => ({
    id: row.id,
    businessId: row.businessId,
    customerName: row.customerName ?? undefined,
    customerWhatsApp: row.customerWhatsApp,
    answers: JSON.parse(row.answers || "{}"),
    isEmergency: !!row.isEmergency,
    photoRefs: JSON.parse(row.photoRefs || "[]"),
    transcriptSummary: row.transcriptSummary,
    createdAt: row.createdAt,
  }));
}
