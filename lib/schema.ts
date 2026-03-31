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
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
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
