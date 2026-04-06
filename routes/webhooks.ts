import { Router, Request, Response } from "express";
import { storage } from "../lib/storage.js";
import { Reactor } from "../reactor/reactor.js";
import { db } from "../lib/db.js";
import { organizations } from "../lib/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// Helper: check if org has Reactor enabled
async function isReactorEnabled(orgId: number | null | undefined): Promise<boolean> {
  if (!orgId) return false;
  const [org] = await db.select({ reactorEnabled: organizations.reactorEnabled }).from(organizations).where(eq(organizations.id, orgId));
  return org?.reactorEnabled === true;
}

// Twilio inbound SMS webhook
router.post("/api/webhooks/twilio/sms", async (req: Request, res: Response) => {
  try {
    const { From, Body, MessageSid } = req.body;

    if (!From || !Body) {
      return res.status(400).send("<Response><Message>Invalid request</Message></Response>");
    }

    console.log(`📩 Inbound SMS from ${From}: ${Body.substring(0, 50)}...`);

    const lead = await storage.getLeadByPhone(From);

    if (lead && await isReactorEnabled(lead.organizationId)) {
      // Route through Reactor
      const reactor = Reactor.getInstance();
      reactor.emit({
        type: "webhook.twilio.sms",
        organizationId: lead.organizationId!,
        payload: { from: From, body: Body, messageSid: MessageSid, leadId: lead.id },
        metadata: { leadId: lead.id, priority: 2, agentSource: "twilio-webhook" },
      });
    } else if (lead) {
      // Legacy path: handle inline
      await storage.createLeadMessage({
        leadId: lead.id,
        channel: "sms",
        content: Body,
        status: "delivered",
        direction: "inbound",
        aiGenerated: false,
      });

      await storage.logActivity({
        entityType: "lead",
        entityId: lead.id,
        action: "sms_received",
        details: `Inbound SMS from ${From}: ${Body.substring(0, 100)}`,
        organizationId: lead.organizationId,
      });
    } else {
      console.log(`⚠���  Inbound SMS from unknown number: ${From}`);
    }

    res.type("text/xml").send("<Response></Response>");
  } catch (error: any) {
    console.error("Twilio SMS webhook error:", error.message);
    res.type("text/xml").send("<Response></Response>");
  }
});

// Twilio call status callback
router.post("/api/webhooks/twilio/call-status", async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, To, From, CallDuration } = req.body;

    console.log(`📞 Call status update: ${CallSid} → ${CallStatus} (${From} → ${To})`);

    const lead = await storage.getLeadByPhone(To);

    if (lead && await isReactorEnabled(lead.organizationId)) {
      const reactor = Reactor.getInstance();
      reactor.emit({
        type: "webhook.twilio.call_status",
        organizationId: lead.organizationId!,
        payload: { callSid: CallSid, callStatus: CallStatus, to: To, from: From, duration: CallDuration },
        metadata: { leadId: lead.id, priority: 4, agentSource: "twilio-webhook" },
      });
    } else if (lead) {
      await storage.logActivity({
        entityType: "lead",
        entityId: lead.id,
        action: "call_status",
        details: `Call ${CallSid}: ${CallStatus}${CallDuration ? ` (${CallDuration}s)` : ""}`,
        organizationId: lead.organizationId,
      });
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error("Twilio call status webhook error:", error.message);
    res.sendStatus(200);
  }
});

// Twilio voice webhook
router.post("/api/webhooks/twilio/voice", async (req: Request, res: Response) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is Reviiv calling on behalf of your sales team. Please hold while we connect you.</Say>
  <Dial>${req.body.To || ""}</Dial>
</Response>`;

  res.type("text/xml").send(twiml);
});

export default router;
