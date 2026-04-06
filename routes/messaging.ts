import { Router, Request, Response } from "express";
import { sendSMS, initiateCall, isTwilioConfigured } from "../lib/twilio.js";
import { sendEmail, isResendConfigured } from "../lib/resend.js";
import { storage } from "../lib/storage.js";
import { requireAuth } from "./auth.js";

const router = Router();

// Send SMS to a lead
router.post("/api/leads/:id/sms", requireAuth, async (req: Request, res: Response) => {
  try {
    const lead = await storage.getLead(parseInt(req.params.id), req.organizationId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!lead.phone) return res.status(400).json({ error: "Lead has no phone number" });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message content required" });

    let deliveryResult = { success: false, sid: undefined as string | undefined, error: "Twilio not configured" };
    if (isTwilioConfigured()) {
      deliveryResult = await sendSMS(lead.phone, message);
    }

    // Always store the message in the database
    const msg = await storage.createLeadMessage({
      leadId: parseInt(req.params.id),
      channel: "sms",
      content: message,
      status: deliveryResult.success ? "sent" : (isTwilioConfigured() ? "failed" : "pending"),
      direction: "outbound",
      aiGenerated: req.body.aiGenerated || false,
    });

    await storage.logActivity({
      entityType: "lead",
      entityId: parseInt(req.params.id),
      action: "sms_sent",
      details: `SMS to ${lead.phone}: ${message.substring(0, 50)}...`,
      organizationId: req.organizationId,
    });

    res.status(201).json({
      message: msg,
      delivery: deliveryResult,
      twilioConfigured: isTwilioConfigured(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send email to a lead
router.post("/api/leads/:id/email", requireAuth, async (req: Request, res: Response) => {
  try {
    const lead = await storage.getLead(parseInt(req.params.id), req.organizationId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!lead.email) return res.status(400).json({ error: "Lead has no email" });

    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: "Subject and body required" });

    let deliveryResult = { success: false, error: "Resend not configured" };
    if (isResendConfigured()) {
      deliveryResult = await sendEmail(lead.email, subject, body);
    }

    const msg = await storage.createLeadMessage({
      leadId: parseInt(req.params.id),
      channel: "email",
      content: `Subject: ${subject}\n\n${body}`,
      status: deliveryResult.success ? "sent" : (isResendConfigured() ? "failed" : "pending"),
      direction: "outbound",
      aiGenerated: req.body.aiGenerated || false,
    });

    await storage.logActivity({
      entityType: "lead",
      entityId: parseInt(req.params.id),
      action: "email_sent",
      details: `Email to ${lead.email}: ${subject}`,
      organizationId: req.organizationId,
    });

    res.status(201).json({
      message: msg,
      delivery: deliveryResult,
      resendConfigured: isResendConfigured(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initiate voice call to a lead
router.post("/api/leads/:id/call", requireAuth, async (req: Request, res: Response) => {
  try {
    const lead = await storage.getLead(parseInt(req.params.id), req.organizationId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!lead.phone) return res.status(400).json({ error: "Lead has no phone number" });

    let callResult = { success: false, sid: undefined as string | undefined, error: "Twilio not configured" };
    if (isTwilioConfigured()) {
      callResult = await initiateCall(lead.phone, req.body.twimlUrl);
    }

    await storage.logActivity({
      entityType: "lead",
      entityId: parseInt(req.params.id),
      action: "call_initiated",
      details: `Voice call to ${lead.phone}`,
      organizationId: req.organizationId,
    });

    res.json({
      call: callResult,
      twilioConfigured: isTwilioConfigured(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Integration status check
router.get("/api/integrations/status", requireAuth, async (_req: Request, res: Response) => {
  res.json({
    twilio: isTwilioConfigured(),
    resend: isResendConfigured(),
  });
});

export default router;
