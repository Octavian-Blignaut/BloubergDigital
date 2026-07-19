-- Messages: full audit trail of every inbound/outbound message.
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  businessId TEXT NOT NULL,
  customerWhatsApp TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  text TEXT NOT NULL,
  photoRefs TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (businessId, customerWhatsApp, createdAt);

-- Leads: structured output once qualification completes.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  businessId TEXT NOT NULL,
  customerName TEXT,
  customerWhatsApp TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '{}',
  isEmergency INTEGER NOT NULL DEFAULT 0,
  photoRefs TEXT NOT NULL DEFAULT '[]',
  transcriptSummary TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_business ON leads (businessId, createdAt);
