import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── USERS ─────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("admin"),
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan").notNull().default("free"),
  industry: text("industry"),
  product: text("product").default("reviiv"),
  monthlyBudgetCents: integer("monthly_budget_cents"),
  dailyBudgetCents: integer("daily_budget_cents"),
  costPerAppointmentCents: integer("cost_per_appointment_cents"),
  reactorEnabled: boolean("reactor_enabled").default(false),
  reactorConfig: text("reactor_config"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  leads: many(leads),
}));

// ─── LEADS ──────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";
export type LeadTemperature = "hot" | "warm" | "cold";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  source: text("source"),
  status: text("status").notNull().default("new"),
  aiScore: integer("ai_score"),
  aiTemperature: text("ai_temperature"),
  aiObjection: text("ai_objection"),
  reactorState: text("reactor_state").default("new"),
  consentStatus: text("consent_status"),
  dncClean: boolean("dnc_clean"),
  sentimentScore: integer("sentiment_score"),
  outreachAttempts: integer("outreach_attempts").default(0),
  nextOutreachAt: timestamp("next_outreach_at"),
  lastAgentId: text("last_agent_id"),
  customFields: text("custom_fields"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [leads.organizationId],
    references: [organizations.id],
  }),
  leadMessages: many(leadMessages),
  appointments: many(appointments),
  proposals: many(proposals),
}));

// ─── LEAD MESSAGES ──────────────────────────────────────────────────────────

export type MessageChannel = "sms" | "email";
export type MessageStatus = "pending" | "sent" | "delivered" | "failed";

export const leadMessages = pgTable("lead_messages", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  direction: text("direction").notNull().default("outbound"),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const leadMessagesRelations = relations(leadMessages, ({ one }) => ({
  lead: one(leads, {
    fields: [leadMessages.leadId],
    references: [leads.id],
  }),
}));

// ─── APPOINTMENTS ───────────────────────────────────────────────────────────

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  calendarEventId: text("calendar_event_id"),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  lead: one(leads, {
    fields: [appointments.leadId],
    references: [leads.id],
  }),
}));

// ─── CAMPAIGNS ──────────────────────────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  targetCount: integer("target_count").default(0),
  sentCount: integer("sent_count").default(0),
  repliedCount: integer("replied_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── PROPOSALS ──────────────────────────────────────────────────────────────

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  pdfUrl: text("pdf_url"),
  amount: integer("amount"),
  viewedAt: timestamp("viewed_at"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const proposalsRelations = relations(proposals, ({ one }) => ({
  lead: one(leads, {
    fields: [proposals.leadId],
    references: [leads.id],
  }),
}));

// ─── ACTIVITY LOGS ──────────────────────────────────────────────────────────

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── REACTOR: LEAD STATE LOG ────────────────────────────────────────────────

export const leadStateLog = pgTable("lead_state_log", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  reason: text("reason"),
  agentId: text("agent_id"),
  eventId: text("event_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── REACTOR: BUDGET LEDGER ─────────────────────────────────────────────────

export const budgetLedger = pgTable("budget_ledger", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  agentId: text("agent_id").notNull(),
  eventId: text("event_id"),
  actionType: text("action_type").notNull(),
  costCents: integer("cost_cents").notNull(),
  dailyDate: text("daily_date").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── REACTOR: EVENT LOG ─────────────────────────────────────────────────────

export const reactorEventLog = pgTable("reactor_event_log", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull(),
  eventType: text("event_type").notNull(),
  organizationId: integer("organization_id"),
  leadId: integer("lead_id"),
  payload: text("payload"),
  agentResults: text("agent_results"),
  status: text("status").notNull().default("processed"),
  processingMs: integer("processing_ms"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── REACTOR: INDUSTRY PRICING ──────────────────────────────────────────────

export const industryPricing = pgTable("industry_pricing", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull().unique(),
  reviivCentsPerAppt: integer("reviiv_cents_per_appt").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── ORG SETTINGS (JSON blob for feature toggles & preferences) ─────────────
// Schema-less key/value store so we can add new toggles without migrations.
export const orgSettings = pgTable("org_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull().unique(),
  settings: text("settings").notNull().default("{}"), // JSON stringified
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── INSERT SCHEMAS ─────────────────────────────────────────────────────────

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});
export const insertLeadMessageSchema = createInsertSchema(leadMessages).omit({
  id: true,
  createdAt: true,
});
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});
export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
});
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});
export const insertLeadStateLogSchema = createInsertSchema(leadStateLog).omit({
  id: true,
  createdAt: true,
});
export const insertBudgetLedgerSchema = createInsertSchema(budgetLedger).omit({
  id: true,
  createdAt: true,
});
export const insertReactorEventLogSchema = createInsertSchema(reactorEventLog).omit({
  id: true,
  createdAt: true,
});
export const insertIndustryPricingSchema = createInsertSchema(industryPricing).omit({
  id: true,
  createdAt: true,
});

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type LeadMessage = typeof leadMessages.$inferSelect;
export type InsertLeadMessage = z.infer<typeof insertLeadMessageSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type LeadStateLogEntry = typeof leadStateLog.$inferSelect;
export type InsertLeadStateLog = z.infer<typeof insertLeadStateLogSchema>;
export type BudgetLedgerEntry = typeof budgetLedger.$inferSelect;
export type InsertBudgetLedger = z.infer<typeof insertBudgetLedgerSchema>;
export type ReactorEventLogEntry = typeof reactorEventLog.$inferSelect;
export type InsertReactorEventLog = z.infer<typeof insertReactorEventLogSchema>;
export type IndustryPricingEntry = typeof industryPricing.$inferSelect;
export type InsertIndustryPricing = z.infer<typeof insertIndustryPricingSchema>;
