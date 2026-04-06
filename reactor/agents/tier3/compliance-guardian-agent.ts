// ─── COMPLIANCE GUARDIAN ─────────────────────────────────────────────────────
// BLOCKING agent. Runs before any outreach. Checks DNC, quiet hours, consent,
// and call frequency. Cannot be overridden.

import { BaseAgent } from "../base-agent.js";
import type { ReactorEvent, AgentResult, AgentContext } from "../../types.js";

export class ComplianceGuardianAgent extends BaseAgent {
  id = "compliance-guardian";
  name = "Compliance Guardian";
  tier = 3 as const;
  priority = 0; // always first
  isBlocking = true;
  timeout = 10_000;

  // Events that require compliance checks
  private readonly OUTREACH_EVENTS = [
    "outreach.sms.send",
    "outreach.email.send",
    "outreach.call.initiate",
    "outreach.voicemail.drop",
    "appointment.request",
  ];

  canHandle(event: ReactorEvent): boolean {
    return (
      event.type === "lead.created" ||
      event.type === "lead.imported" ||
      this.OUTREACH_EVENTS.includes(event.type)
    );
  }

  protected async _execute(event: ReactorEvent, context: AgentContext): Promise<AgentResult> {
    const leadId = event.metadata.leadId || event.payload.leadId;
    if (!leadId) {
      return this.ok({ reason: "No lead — compliance N/A" });
    }

    // On lead creation/import: validate the lead
    if (event.type === "lead.created" || event.type === "lead.imported") {
      return this.validateLead(leadId, context);
    }

    // On outreach: run pre-outreach compliance checks
    return this.checkOutreach(leadId, event, context);
  }

  private async validateLead(leadId: number, context: AgentContext): Promise<AgentResult> {
    const lead = await context.storage.getLead(leadId);
    if (!lead) return this.fail("Lead not found");

    // Check DNC status (placeholder — will integrate Blacklist Alliance)
    const dncClean = await this.checkDNC(lead.phone);

    if (!dncClean) {
      context.log("warn", `Lead ${leadId} is on DNC list — blocking`, { phone: lead.phone });
      return this.fail("Lead is on the Do Not Call registry", {
        leadStateTransition: "dnc_blocked",
        data: { dncClean: false },
      });
    }

    // Mark lead as validated
    await context.storage.updateLead(leadId, {
      dncClean: true,
    } as any);

    return this.ok(
      { dncClean: true, validated: true },
      { leadStateTransition: "validating" }
    );
  }

  private async checkOutreach(leadId: number, event: ReactorEvent, context: AgentContext): Promise<AgentResult> {
    const lead = await context.storage.getLead(leadId);
    if (!lead) return this.fail("Lead not found");

    // 1. DNC check (re-verify for outreach)
    if (lead.dncClean === false) {
      return this.fail("Lead is DNC blocked", { leadStateTransition: "dnc_blocked" });
    }

    // 2. Quiet hours check (no calls/SMS before 8AM or after 9PM local time)
    if (event.type === "outreach.sms.send" || event.type === "outreach.call.initiate" || event.type === "outreach.voicemail.drop") {
      const quietHoursViolation = this.checkQuietHours();
      if (quietHoursViolation) {
        return this.fail("Quiet hours — outreach blocked (8AM-9PM only)", {
          data: { reason: "quiet_hours", retryAfter: quietHoursViolation },
        });
      }
    }

    // 3. Call frequency check (max 3 attempts per 7 days)
    if (event.type === "outreach.call.initiate" || event.type === "outreach.sms.send") {
      const attempts = (lead as any).outreachAttempts || 0;
      if (attempts >= 3) {
        context.log("warn", `Lead ${leadId} has ${attempts} outreach attempts — frequency limit reached`);
        return this.fail("Max outreach attempts reached (3 per 7-day period)", {
          data: { attempts, limit: 3 },
        });
      }
    }

    // 4. Consent check
    if (event.type === "outreach.call.initiate" || event.type === "outreach.sms.send") {
      const consentStatus = (lead as any).consentStatus;
      if (consentStatus === "opted_out") {
        return this.fail("Lead has opted out", { leadStateTransition: "dnc_blocked" });
      }
    }

    return this.ok({ compliant: true });
  }

  // ─── DNC Check (placeholder — integrate Blacklist Alliance later) ───

  private async checkDNC(phone: string | null): Promise<boolean> {
    if (!phone) return true; // No phone = no DNC issue
    // TODO: Integrate Blacklist Alliance API
    // For now, all numbers pass
    return true;
  }

  // ─── Quiet Hours Check ──────────────────────────────────────────────

  private checkQuietHours(): string | null {
    // TCPA: No calls before 8AM or after 9PM in recipient's local time
    // For now, use server time. TODO: Use lead's timezone
    const now = new Date();
    const hour = now.getHours();

    if (hour < 8) {
      const resumeAt = new Date(now);
      resumeAt.setHours(8, 0, 0, 0);
      return resumeAt.toISOString();
    }
    if (hour >= 21) {
      const resumeAt = new Date(now);
      resumeAt.setDate(resumeAt.getDate() + 1);
      resumeAt.setHours(8, 0, 0, 0);
      return resumeAt.toISOString();
    }

    return null; // Within allowed hours
  }
}
