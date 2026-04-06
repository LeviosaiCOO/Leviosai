// ─── APPOINTMENT BOOKING AGENT ───────────────────────────────────────────────
// Books confirmed appointments. Will integrate Cal.com. For now uses internal DB.

import { BaseAgent } from "../base-agent.js";
import type { ReactorEvent, AgentResult, AgentContext } from "../../types.js";

export class AppointmentBookingAgent extends BaseAgent {
  id = "appointment-booking";
  name = "Appointment Booking Agent";
  tier = 1 as const;
  priority = 4;
  isBlocking = false;
  timeout = 15_000;

  canHandle(event: ReactorEvent): boolean {
    return event.type === "appointment.request";
  }

  protected async _execute(event: ReactorEvent, context: AgentContext): Promise<AgentResult> {
    const leadId = event.metadata.leadId || event.payload.leadId;
    if (!leadId) return this.fail("No leadId");

    const lead = await context.storage.getLead(leadId);
    if (!lead) return this.fail("Lead not found");

    const { title, scheduledAt } = event.payload;
    if (!title || !scheduledAt) return this.fail("title and scheduledAt required");

    // TODO: Integrate Cal.com API for booking
    // For now, create appointment directly in DB
    const appt = await context.storage.createAppointment({
      leadId,
      title,
      scheduledAt: new Date(scheduledAt),
    });

    // Emit appointment confirmed event (triggers budget check for per-appt cost)
    context.emit({
      type: "appointment.confirmed",
      organizationId: event.organizationId,
      payload: { leadId, appointmentId: appt.id, scheduledAt },
      metadata: { leadId, priority: 2, agentSource: this.id },
    });

    return this.ok(
      { appointmentId: appt.id, scheduledAt },
      { leadStateTransition: "appointment_set" }
    );
  }
}
