import { eq, desc, asc, sql, and, ilike, or } from "drizzle-orm";
import { db } from "./db.js";
import {
  organizations,
  leads,
  leadMessages,
  appointments,
  campaigns,
  proposals,
  activityLogs,
  type InsertOrganization,
  type InsertLead,
  type InsertLeadMessage,
  type InsertAppointment,
  type InsertCampaign,
  type InsertProposal,
  type InsertActivityLog,
} from "./schema.js";

// ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

export const storage = {
  // Organizations
  async getOrganizations() {
    return db.select().from(organizations).orderBy(asc(organizations.name));
  },

  async getOrganization(id: number) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org || null;
  },

  async createOrganization(data: InsertOrganization) {
    const [org] = await db.insert(organizations).values(data).returning();
    return org;
  },

  // ─── LEADS ──────────────────────────────────────────────────────────────

  async getLeads(filters?: { status?: string; temperature?: string; search?: string }) {
    let query = db
      .select({
        id: leads.id,
        organizationId: leads.organizationId,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        source: leads.source,
        status: leads.status,
        aiScore: leads.aiScore,
        aiTemperature: leads.aiTemperature,
        aiObjection: leads.aiObjection,
        lastContactedAt: leads.lastContactedAt,
        createdAt: leads.createdAt,
        orgName: organizations.name,
      })
      .from(leads)
      .leftJoin(organizations, eq(leads.organizationId, organizations.id))
      .orderBy(desc(leads.createdAt))
      .$dynamic();

    // Apply filters
    const conditions = [];
    if (filters?.status) conditions.push(eq(leads.status, filters.status));
    if (filters?.temperature)
      conditions.push(eq(leads.aiTemperature, filters.temperature));
    if (filters?.search) {
      conditions.push(
        or(
          ilike(leads.firstName, `%${filters.search}%`),
          ilike(leads.lastName, `%${filters.search}%`),
          ilike(leads.email, `%${filters.search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query;
  },

  async getLead(id: number) {
    const [lead] = await db
      .select({
        id: leads.id,
        organizationId: leads.organizationId,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        source: leads.source,
        status: leads.status,
        aiScore: leads.aiScore,
        aiTemperature: leads.aiTemperature,
        aiObjection: leads.aiObjection,
        lastContactedAt: leads.lastContactedAt,
        createdAt: leads.createdAt,
        orgName: organizations.name,
      })
      .from(leads)
      .leftJoin(organizations, eq(leads.organizationId, organizations.id))
      .where(eq(leads.id, id));
    return lead || null;
  },

  async getLeadByPhone(phone: string) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.phone, phone));
    return lead || null;
  },

  async getLeadByEmail(email: string) {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.email, email));
    return lead || null;
  },

  async createLead(data: InsertLead) {
    const [lead] = await db.insert(leads).values(data).returning();
    return lead;
  },

  async updateLead(id: number, data: Partial<InsertLead>) {
    const [lead] = await db
      .update(leads)
      .set(data)
      .where(eq(leads.id, id))
      .returning();
    return lead;
  },

  async deleteLead(id: number) {
    await db.delete(leads).where(eq(leads.id, id));
  },

  // Pipeline stats
  async getPipelineStats() {
    const result = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .groupBy(leads.status);
    return result;
  },

  async getLeadsByTemperature() {
    return db
      .select({
        temperature: leads.aiTemperature,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .groupBy(leads.aiTemperature);
  },

  // ─── LEAD MESSAGES ────────────────────────────────────────────────────

  async getLeadMessages(leadId: number) {
    return db
      .select()
      .from(leadMessages)
      .where(eq(leadMessages.leadId, leadId))
      .orderBy(asc(leadMessages.createdAt));
  },

  async createLeadMessage(data: InsertLeadMessage) {
    const [msg] = await db.insert(leadMessages).values(data).returning();
    // Update lead's lastContactedAt
    await db
      .update(leads)
      .set({ lastContactedAt: new Date() })
      .where(eq(leads.id, data.leadId));
    return msg;
  },

  async getRecentMessages(limit = 20) {
    return db
      .select({
        id: leadMessages.id,
        leadId: leadMessages.leadId,
        channel: leadMessages.channel,
        content: leadMessages.content,
        status: leadMessages.status,
        direction: leadMessages.direction,
        aiGenerated: leadMessages.aiGenerated,
        createdAt: leadMessages.createdAt,
        leadFirstName: leads.firstName,
        leadLastName: leads.lastName,
      })
      .from(leadMessages)
      .leftJoin(leads, eq(leadMessages.leadId, leads.id))
      .orderBy(desc(leadMessages.createdAt))
      .limit(limit);
  },

  // ─── APPOINTMENTS ─────────────────────────────────────────────────────

  async getAppointments(filters?: { status?: string; leadId?: number }) {
    let query = db
      .select({
        id: appointments.id,
        leadId: appointments.leadId,
        calendarEventId: appointments.calendarEventId,
        title: appointments.title,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
        createdAt: appointments.createdAt,
        leadFirstName: leads.firstName,
        leadLastName: leads.lastName,
        leadEmail: leads.email,
        orgName: organizations.name,
      })
      .from(appointments)
      .leftJoin(leads, eq(appointments.leadId, leads.id))
      .leftJoin(organizations, eq(leads.organizationId, organizations.id))
      .orderBy(asc(appointments.scheduledAt))
      .$dynamic();

    const conditions = [];
    if (filters?.status) conditions.push(eq(appointments.status, filters.status));
    if (filters?.leadId) conditions.push(eq(appointments.leadId, filters.leadId));
    if (conditions.length > 0) query = query.where(and(...conditions));

    return query;
  },

  async createAppointment(data: InsertAppointment) {
    const [appt] = await db.insert(appointments).values(data).returning();
    return appt;
  },

  async updateAppointment(id: number, data: Partial<InsertAppointment>) {
    const [appt] = await db
      .update(appointments)
      .set(data)
      .where(eq(appointments.id, id))
      .returning();
    return appt;
  },

  // ─── CAMPAIGNS ────────────────────────────────────────────────────────

  async getCampaigns() {
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  },

  async getCampaign(id: number) {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id));
    return campaign || null;
  },

  async createCampaign(data: InsertCampaign) {
    const [campaign] = await db.insert(campaigns).values(data).returning();
    return campaign;
  },

  async updateCampaign(id: number, data: Partial<InsertCampaign>) {
    const [campaign] = await db
      .update(campaigns)
      .set(data)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  },

  // ─── PROPOSALS ────────────────────────────────────────────────────────

  async getProposals(leadId?: number) {
    let query = db
      .select({
        id: proposals.id,
        leadId: proposals.leadId,
        title: proposals.title,
        pdfUrl: proposals.pdfUrl,
        amount: proposals.amount,
        viewedAt: proposals.viewedAt,
        status: proposals.status,
        createdAt: proposals.createdAt,
        leadFirstName: leads.firstName,
        leadLastName: leads.lastName,
      })
      .from(proposals)
      .leftJoin(leads, eq(proposals.leadId, leads.id))
      .orderBy(desc(proposals.createdAt))
      .$dynamic();

    if (leadId) query = query.where(eq(proposals.leadId, leadId));
    return query;
  },

  async createProposal(data: InsertProposal) {
    const [proposal] = await db.insert(proposals).values(data).returning();
    return proposal;
  },

  async updateProposal(id: number, data: Partial<InsertProposal>) {
    const [proposal] = await db
      .update(proposals)
      .set(data)
      .where(eq(proposals.id, id))
      .returning();
    return proposal;
  },

  // ─── ACTIVITY LOGS ────────────────────────────────────────────────────

  async getActivityLogs(entityType?: string, entityId?: number, limit = 50) {
    let query = db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .$dynamic();

    const conditions = [];
    if (entityType) conditions.push(eq(activityLogs.entityType, entityType));
    if (entityId) conditions.push(eq(activityLogs.entityId, entityId));
    if (conditions.length > 0) query = query.where(and(...conditions));

    return query;
  },

  async logActivity(data: InsertActivityLog) {
    const [log] = await db.insert(activityLogs).values(data).returning();
    return log;
  },

  // ─── DASHBOARD STATS ─────────────────────────────────────────────────

  async getDashboardStats() {
    const [leadCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads);

    const [hotCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.aiTemperature, "hot"));

    const [wonCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.status, "won"));

    const [proposalTotal] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)::int` })
      .from(proposals)
      .where(
        or(
          eq(proposals.status, "sent"),
          eq(proposals.status, "viewed"),
          eq(proposals.status, "draft")
        )
      );

    const [wonTotal] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)::int` })
      .from(proposals)
      .where(eq(proposals.status, "accepted"));

    const pipeline = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .groupBy(leads.status);

    const upcomingAppointments = await db
      .select({
        id: appointments.id,
        title: appointments.title,
        scheduledAt: appointments.scheduledAt,
        leadFirstName: leads.firstName,
        leadLastName: leads.lastName,
      })
      .from(appointments)
      .leftJoin(leads, eq(appointments.leadId, leads.id))
      .where(
        and(
          eq(appointments.status, "scheduled"),
          sql`${appointments.scheduledAt} >= NOW()`
        )
      )
      .orderBy(asc(appointments.scheduledAt))
      .limit(5);

    return {
      totalLeads: leadCount.count,
      hotLeads: hotCount.count,
      wonDeals: wonCount.count,
      pipelineValue: proposalTotal.total,
      wonRevenue: wonTotal.total,
      pipeline,
      upcomingAppointments,
    };
  },
};
