import { Router, Request, Response } from "express";
import { storage } from "../lib/storage.js";

const router = Router();

// ─── DASHBOARD ──────────────────────────────────────────────────────────────

router.get("/api/dashboard", async (_req: Request, res: Response) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

router.get("/api/organizations", async (_req, res) => {
  try {
    const orgs = await storage.getOrganizations();
    res.json(orgs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/organizations", async (req, res) => {
  try {
    const org = await storage.createOrganization(req.body);
    res.status(201).json(org);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── LEADS ──────────────────────────────────────────────────────────────────

router.get("/api/leads", async (req, res) => {
  try {
    const { status, temperature, search } = req.query;
    const leads = await storage.getLeads({
      status: status as string,
      temperature: temperature as string,
      search: search as string,
    });
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/leads/:id", async (req, res) => {
  try {
    const lead = await storage.getLead(parseInt(req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/leads", async (req, res) => {
  try {
    const lead = await storage.createLead(req.body);
    await storage.logActivity({
      entityType: "lead",
      entityId: lead.id,
      action: "created",
      details: `Lead ${lead.firstName} ${lead.lastName} created`,
    });
    res.status(201).json(lead);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/api/leads/:id", async (req, res) => {
  try {
    const lead = await storage.updateLead(parseInt(req.params.id), req.body);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    await storage.logActivity({
      entityType: "lead",
      entityId: lead.id,
      action: "updated",
      details: `Lead updated: ${JSON.stringify(req.body)}`,
    });
    res.json(lead);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/leads/:id", async (req, res) => {
  try {
    await storage.deleteLead(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/leads/pipeline/stats", async (_req, res) => {
  try {
    const stats = await storage.getPipelineStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── LEAD MESSAGES ──────────────────────────────────────────────────────────

router.get("/api/leads/:id/messages", async (req, res) => {
  try {
    const messages = await storage.getLeadMessages(parseInt(req.params.id));
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/leads/:id/messages", async (req, res) => {
  try {
    const msg = await storage.createLeadMessage({
      ...req.body,
      leadId: parseInt(req.params.id),
    });
    await storage.logActivity({
      entityType: "lead",
      entityId: parseInt(req.params.id),
      action: "message_sent",
      details: `${req.body.channel} message ${req.body.direction || "outbound"}`,
    });
    res.status(201).json(msg);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/messages/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const messages = await storage.getRecentMessages(limit);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── APPOINTMENTS ───────────────────────────────────────────────────────────

router.get("/api/appointments", async (req, res) => {
  try {
    const { status, leadId } = req.query;
    const appts = await storage.getAppointments({
      status: status as string,
      leadId: leadId ? parseInt(leadId as string) : undefined,
    });
    res.json(appts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/appointments", async (req, res) => {
  try {
    const appt = await storage.createAppointment(req.body);
    await storage.logActivity({
      entityType: "appointment",
      entityId: appt.id,
      action: "created",
      details: `Appointment "${appt.title}" scheduled for ${appt.scheduledAt}`,
    });
    res.status(201).json(appt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/api/appointments/:id", async (req, res) => {
  try {
    const appt = await storage.updateAppointment(
      parseInt(req.params.id),
      req.body
    );
    if (!appt) return res.status(404).json({ error: "Appointment not found" });
    res.json(appt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── CAMPAIGNS ──────────────────────────────────────────────────────────────

router.get("/api/campaigns", async (_req, res) => {
  try {
    const campaigns = await storage.getCampaigns();
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/campaigns", async (req, res) => {
  try {
    const campaign = await storage.createCampaign(req.body);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/api/campaigns/:id", async (req, res) => {
  try {
    const campaign = await storage.updateCampaign(
      parseInt(req.params.id),
      req.body
    );
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json(campaign);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── PROPOSALS ──────────────────────────────────────────────────────────────

router.get("/api/proposals", async (req, res) => {
  try {
    const leadId = req.query.leadId
      ? parseInt(req.query.leadId as string)
      : undefined;
    const proposals = await storage.getProposals(leadId);
    res.json(proposals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/proposals", async (req, res) => {
  try {
    const proposal = await storage.createProposal(req.body);
    await storage.logActivity({
      entityType: "proposal",
      entityId: proposal.id,
      action: "created",
      details: `Proposal "${proposal.title}" for $${proposal.amount}`,
    });
    res.status(201).json(proposal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/api/proposals/:id", async (req, res) => {
  try {
    const proposal = await storage.updateProposal(
      parseInt(req.params.id),
      req.body
    );
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    res.json(proposal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── ACTIVITY LOGS ──────────────────────────────────────────────────────────

router.get("/api/activity", async (req, res) => {
  try {
    const { entityType, entityId, limit } = req.query;
    const logs = await storage.getActivityLogs(
      entityType as string,
      entityId ? parseInt(entityId as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── HEALTH CHECK ───────────────────────────────────────────────────────────

router.get("/api/health", async (_req, res) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json({
      status: "ok",
      database: "connected",
      totalLeads: stats.totalLeads,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", database: "disconnected", error: error.message });
  }
});

export default router;
