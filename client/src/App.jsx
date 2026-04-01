import { useState, useEffect, useRef, useCallback } from "react";
import _ from "lodash";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { auth, setToken, clearToken, isAuthenticated, dashboard, leadsApi, appointmentsApi, campaignsApi, proposalsApi, activityApi, messagesApi, messagingApi, aiApi } from "./api.js";

// ============================================================
// CATALYST — Agentic AI Sales & Lead Revival Platform
// Products: riivīv (dead lead revival) | alīv (new lead engine)
// v2.0 — With 5 Approved Strategic Features
// ============================================================

const COLORS = {
  bg: "#0a0a0a", surface: "#141414", surfaceAlt: "#1a1a1a",
  border: "#2a2a2a", borderLight: "#333",
  text: "#e8e8e8", textMuted: "#888", textDim: "#555",
  orange: "#e67e22", orangeLight: "#f39c12", orangeDark: "#d35400",
  orangeGlow: "rgba(230,126,34,0.15)",
  green: "#27ae60", greenLight: "#2ecc71", red: "#e74c3c",
  blue: "#3498db", purple: "#9b59b6", yellow: "#f1c40f",
  teal: "#1abc9c",
};

const TIERS = {
  riiviv: { setup: [2500, 3500, 5000], tierNames: ["Starter", "Growth", "Enterprise"], perAppt: 400, maintenance: [500, 750, 1000] },
  aliv: { setup: [2500, 3500, 5000], tierNames: ["Starter", "Growth", "Enterprise"], perAppt: 500, maintenance: [500, 750, 1000] },
};

const CRM_INTEGRATIONS = [
  { name: "Salesforce", icon: "☁️", connected: false }, { name: "HubSpot", icon: "🟠", connected: false },
  { name: "Zoho CRM", icon: "📋", connected: false }, { name: "GoHighLevel", icon: "⚡", connected: false },
  { name: "Pipedrive", icon: "🔵", connected: false }, { name: "Close.com", icon: "📞", connected: false },
  { name: "Freshsales", icon: "🟢", connected: false }, { name: "Monday CRM", icon: "🟣", connected: false },
  { name: "Copper", icon: "🔶", connected: false }, { name: "Insightly", icon: "💡", connected: false },
];

const CALENDAR_INTEGRATIONS = [
  { name: "Google Calendar", icon: "📅", connected: false }, { name: "Calendly", icon: "🗓️", connected: false },
  { name: "Microsoft Outlook", icon: "📧", connected: false }, { name: "Cal.com", icon: "⏰", connected: false },
  { name: "Acuity Scheduling", icon: "📆", connected: false }, { name: "ScheduleOnce", icon: "🕐", connected: false },
];

const VOICE_OPTIONS = [
  { id: "v1", name: "Alex", gender: "Male", tone: "Warm & Professional", accent: "American" },
  { id: "v2", name: "Sarah", gender: "Female", tone: "Friendly & Confident", accent: "American" },
  { id: "v3", name: "James", gender: "Male", tone: "Authoritative & Calm", accent: "British" },
  { id: "v4", name: "Maya", gender: "Female", tone: "Energetic & Persuasive", accent: "American" },
  { id: "v5", name: "Custom", gender: "—", tone: "Upload Voice Sample", accent: "Custom" },
];

const INDUSTRIES = [
  "Solar / Renewable Energy", "HVAC", "Roofing", "Windows & Doors", "Home Security",
  "Insurance", "Real Estate", "Financial Services", "Automotive", "Medical / Dental",
  "Legal Services", "Home Improvement", "Pest Control", "Landscaping", "Pool / Spa",
  "Plumbing", "Electrical", "Painting", "Flooring", "Kitchen & Bath",
];

const SAMPLE_LEADS = [
  { id: 1, name: "Marcus Johnson", phone: "(555) 234-5678", email: "mjohnson@email.com", source: "Web Form", status: "Aged", lastContact: "2025-08-14", industry: "Solar", score: 72, baseScore: 85, decayRate: -1.6, marketBoost: 0, notes: "Showed interest in 8kW system, stalled at financing", conversations: [
    { id: "c1", type: "sms", date: "2025-08-14", direction: "outbound", agent: "Maya", duration: null, transcript: [
      { role: "agent", text: "Hi Marcus, this is Maya from SunPower Solar. I wanted to follow up on the 8kW system you were looking at — utility rates in your area just went up 12% and there are some great new incentives. Would you like to hear about them?" },
      { role: "lead", text: "Maybe later, not a great time right now" },
      { role: "agent", text: "No problem at all! I'll check back in a few weeks. In the meantime, if you'd like to chat sooner, just text back anytime. Have a great day, Marcus!" },
    ], outcome: "deferred", sentiment: "neutral" },
  ]},
  { id: 2, name: "Patricia Williams", phone: "(555) 345-6789", email: "pwilliams@email.com", source: "Referral", status: "Dead", lastContact: "2025-06-22", industry: "Solar", score: 45, baseScore: 72, decayRate: -3.0, marketBoost: 0, notes: "Husband objected to cost, may reconsider", conversations: [] },
  { id: 3, name: "David Chen", phone: "(555) 456-7890", email: "dchen@email.com", source: "Facebook Ad", status: "Aged", lastContact: "2025-09-01", industry: "Solar", score: 68, baseScore: 78, decayRate: -1.4, marketBoost: 5, notes: "Requested quote, never responded to follow-up", conversations: [
    { id: "c2", type: "email", date: "2025-09-01", direction: "outbound", agent: "System", duration: null, transcript: [
      { role: "agent", text: "Subject: Your Solar Quote — Quick Update\n\nHi David,\n\nI wanted to circle back on the quote we put together for you. Since then, there have been some changes to the federal tax credit that could save you an additional $2,400. Would it be worth a quick 10-minute call to go over the updated numbers?\n\nBest,\nSunPower Solar Team" },
    ], outcome: "no_response", sentiment: "neutral" },
  ]},
  { id: 4, name: "Linda Martinez", phone: "(555) 567-8901", email: "lmartinez@email.com", source: "Google Ads", status: "Dead", lastContact: "2025-05-11", industry: "Solar", score: 33, baseScore: 65, decayRate: -3.2, marketBoost: 0, notes: "Said timing wasn't right, moving in 6 months", conversations: [] },
  { id: 5, name: "Robert Taylor", phone: "(555) 678-9012", email: "rtaylor@email.com", source: "Door Knock", status: "Revived", lastContact: "2026-03-10", industry: "Solar", score: 88, baseScore: 88, decayRate: 0, marketBoost: 0, notes: "Re-engaged via text, interested in battery storage", conversations: [
    { id: "c3", type: "sms", date: "2026-03-08", direction: "outbound", agent: "Sarah", duration: null, transcript: [
      { role: "agent", text: "Hi Robert! This is Sarah from SunPower Solar. We connected a while back about solar — just wanted to share that battery storage prices have dropped 22% since we last spoke. With the new utility rate hikes, many homeowners are locking in energy independence. Thought of you!" },
      { role: "lead", text: "Oh interesting! I've actually been thinking about this again. What are the new prices looking like?" },
      { role: "agent", text: "Great timing! A full solar + battery system is now running about $28,500 before the 30% federal tax credit — so effectively around $19,950. That's about $150/mo on financing, which is likely less than your current electric bill. Want me to set up a quick consultation?" },
      { role: "lead", text: "Yeah actually that sounds good. When do you have available?" },
      { role: "agent", text: "Awesome! How about this Thursday at 10am, or would Friday at 2pm work better for your schedule?" },
      { role: "lead", text: "Thursday at 10 works" },
      { role: "agent", text: "Perfect! You're all set for Thursday at 10am. I'll send a confirmation with all the details. Looking forward to it, Robert!" },
    ], outcome: "appointment_set", sentiment: "positive" },
    { id: "c4", type: "voice", date: "2026-03-10", direction: "outbound", agent: "Sarah", duration: "4:32", transcript: [
      { role: "agent", text: "Hi Robert, this is Sarah calling from SunPower Solar. I'm an AI assistant calling on behalf of the team — I just wanted to confirm your consultation scheduled for Thursday at 10am. Is that still looking good for you?" },
      { role: "lead", text: "Yeah, we're still good for Thursday." },
      { role: "agent", text: "Wonderful! Just so you know, our consultant Mike Torres will be handling your appointment. He specializes in solar plus battery systems and can walk you through all the financing options — including cash, loan, lease, and power purchase agreements. Is there anything specific you'd like Mike to prepare for?" },
      { role: "lead", text: "Actually yeah, can he bring info on the battery backup? We get power outages sometimes." },
      { role: "agent", text: "Absolutely, I'll make sure Mike has all the battery backup details ready, including how the system handles outages automatically. Is there anything else I can help with?" },
      { role: "lead", text: "No, that's it. Thanks!" },
      { role: "agent", text: "Great, you're all set! Have a wonderful rest of your day, Robert." },
    ], outcome: "confirmed", sentiment: "positive" },
  ]},
  { id: 6, name: "Jennifer Adams", phone: "(555) 789-0123", email: "jadams@email.com", source: "Zillow", status: "New", lastContact: "2026-03-15", industry: "Solar", score: 91, baseScore: 91, decayRate: 0, marketBoost: 0, notes: "Inbound lead, high intent, requested callback", conversations: [] },
  { id: 7, name: "Michael Brown", phone: "(555) 890-1234", email: "mbrown@email.com", source: "CRM Import", status: "Aged", lastContact: "2025-07-19", industry: "Solar", score: 55, baseScore: 74, decayRate: -2.1, marketBoost: 3, notes: "Interested but concerned about roof age", conversations: [] },
  { id: 8, name: "Sandra Wilson", phone: "(555) 901-2345", email: "swilson@email.com", source: "Instagram", status: "Appointment Set", lastContact: "2026-03-14", industry: "Solar", score: 95, baseScore: 95, decayRate: 0, marketBoost: 0, notes: "Appointment 3/18 at 2pm, very motivated", conversations: [
    { id: "c5", type: "voice", date: "2026-03-13", direction: "outbound", agent: "Alex", duration: "6:18", transcript: [
      { role: "agent", text: "Hi Sandra, this is Alex calling from SunPower Solar. I'm an AI assistant reaching out because you expressed interest in going solar. I'd love to help you take the next step. Do you have a few minutes?" },
      { role: "lead", text: "Sure, I've been wanting to do this for a while. My electric bill is insane." },
      { role: "agent", text: "I hear that a lot, and honestly, that's one of the best reasons to look into solar. With utility rates climbing, locking in your energy costs can save a significant amount over time. Can I ask — what's your average monthly electric bill right now?" },
      { role: "lead", text: "It's been around $320 lately. Summer it goes up to like $400." },
      { role: "agent", text: "Wow, yeah, that's definitely on the higher side. The good news is, with a properly sized system, most homeowners in your area can eliminate 90-95% of that bill. Plus there's a 30% federal tax credit right now. Would you like to set up a free consultation where one of our experts can design a custom system for your home?" },
      { role: "lead", text: "Yes! When can we do it?" },
      { role: "agent", text: "Great! I have Monday the 18th at 2pm or Wednesday the 20th at 11am — which works better for you?" },
      { role: "lead", text: "Monday at 2 is perfect." },
      { role: "agent", text: "You're all set for Monday, March 18th at 2pm. Our consultant Sarah Kim will come to your home — she'll review your roof, your energy usage, and walk you through all the options including financing. I'll send you a confirmation text and email right now. Is there anything else I can help with?" },
      { role: "lead", text: "No, that's great. Thank you!" },
      { role: "agent", text: "My pleasure, Sandra! You're going to love what solar can do for your home. Have a wonderful day!" },
    ], outcome: "appointment_set", sentiment: "very_positive" },
  ]},
];

const SAMPLE_PROPOSALS = [
  { id: "P001", customer: "Robert Taylor", system: "8.4kW Solar + Battery", cashPrice: 28500, loanPayment: 185, leasePayment: 125, ppaRate: 0.089, status: "Sent", created: "2026-03-12" },
  { id: "P002", customer: "Sandra Wilson", system: "10.2kW Solar", cashPrice: 32000, loanPayment: 210, leasePayment: 155, ppaRate: 0.095, status: "Viewed", created: "2026-03-14" },
];

// FEATURE 1: Show-up guarantee appointment data
const SAMPLE_APPOINTMENTS = [
  { id: 1, lead: "Sandra Wilson", date: "2026-03-18", time: "2:00 PM", type: "In-Home Consultation", rep: "Sarah Kim", status: "Confirmed", product: "Solar 10.2kW", showed: null, creditApplied: false },
  { id: 2, lead: "Robert Taylor", date: "2026-03-19", time: "10:00 AM", type: "Virtual Consultation", rep: "Mike Torres", status: "Confirmed", product: "Solar + Battery", showed: null, creditApplied: false },
  { id: 3, lead: "David Chen", date: "2026-03-20", time: "3:30 PM", type: "Phone Consultation", rep: "Mike Torres", status: "Pending", product: "Solar 6kW", showed: null, creditApplied: false },
  { id: 4, lead: "Jennifer Adams", date: "2026-03-21", time: "11:00 AM", type: "In-Home Consultation", rep: "Sarah Kim", status: "Confirmed", product: "Solar 12kW", showed: null, creditApplied: false },
  { id: 5, lead: "Marcus Johnson", date: "2026-03-14", time: "1:00 PM", type: "Virtual Consultation", rep: "Mike Torres", status: "Completed", product: "Solar 8kW", showed: false, creditApplied: true },
  { id: 6, lead: "Prev Client A", date: "2026-03-10", time: "9:00 AM", type: "In-Home", rep: "Sarah Kim", status: "Completed", product: "Solar 7kW", showed: true, creditApplied: false },
  { id: 7, lead: "Prev Client B", date: "2026-03-11", time: "3:00 PM", type: "Virtual", rep: "Mike Torres", status: "Completed", product: "HVAC", showed: true, creditApplied: false },
];

// FEATURE 5: Performance thresholds for tier suggestions
const TIER_THRESHOLDS = {
  suggestAliv: 50,   // riivīv appts to suggest alīv
  suggestSales: 25,  // alīv appts to suggest sales tool
  suggestEnterprise: 100, // total appts to suggest enterprise tier
};

// ============================================================
// STYLES
// ============================================================
const S = {
  app: { display: "flex", height: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif", overflow: "hidden" },
  sidebar: { width: 260, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" },
  sidebarNav: { flex: 1, overflowY: "auto", padding: "8px 0" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", cursor: "pointer", fontSize: 13.5,
    background: active ? COLORS.orangeGlow : "transparent",
    color: active ? COLORS.orangeLight : COLORS.textMuted,
    borderLeft: active ? `3px solid ${COLORS.orange}` : "3px solid transparent",
    transition: "all 0.2s", fontWeight: active ? 600 : 400,
  }),
  navSection: { padding: "16px 20px 6px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.textDim },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, flexShrink: 0 },
  content: { flex: 1, overflowY: "auto", padding: 28 },
  card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 20 },
  cardHeader: { fontSize: 15, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" },
  statCard: (color) => ({
    background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "20px 24px",
    borderTop: `3px solid ${color}`, flex: 1, minWidth: 180,
  }),
  badge: (color) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: `${color}22`, color: color, border: `1px solid ${color}44`,
  }),
  btn: (v = "primary") => ({
    padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
    fontFamily: "inherit", transition: "all 0.2s",
    ...(v === "primary" ? { background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orangeDark})`, color: "#fff" } : {}),
    ...(v === "secondary" ? { background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` } : {}),
    ...(v === "ghost" ? { background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}` } : {}),
    ...(v === "success" ? { background: COLORS.green, color: "#fff" } : {}),
    ...(v === "danger" ? { background: COLORS.red, color: "#fff" } : {}),
    ...(v === "teal" ? { background: COLORS.teal, color: "#fff" } : {}),
  }),
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt, color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  select: { padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt, color: COLORS.text, fontSize: 13, fontFamily: "inherit", outline: "none" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}22` },
  tag: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, background: `${color}22`, color }),
  tab: (active) => ({
    padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? COLORS.orangeGlow : "transparent",
    color: active ? COLORS.orangeLight : COLORS.textMuted,
    border: active ? `1px solid ${COLORS.orange}44` : "1px solid transparent", transition: "all 0.2s",
  }),
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" },
  modalContent: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 32, maxWidth: 560, width: "90%", maxHeight: "85vh", overflowY: "auto" },
};

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Logo({ size = "default" }) {
  const s = size === "small" ? 0.6 : 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * s }}>
      <svg width={32 * s} height={32 * s} viewBox="0 0 100 100">
        <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f39c12" /><stop offset="100%" stopColor="#d35400" /></linearGradient></defs>
        <polygon points="50,5 61,35 95,35 68,55 78,88 50,68 22,88 32,55 5,35 39,35" fill="url(#sg)" />
        <polygon points="50,22 56,38 73,38 60,48 64,65 50,55 36,65 40,48 27,38 44,38" fill="#f39c12" opacity="0.6" />
      </svg>
      <span style={{ fontSize: 24 * s, fontWeight: 700, background: "linear-gradient(135deg, #f39c12, #e67e22, #d35400)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5 }}>catalyst</span>
    </div>
  );
}

function StatCard({ label, value, change, color = COLORS.orange, icon, suffix = "" }) {
  return (
    <div style={S.statCard(color)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>{value}{suffix && <span style={{ fontSize: 14, fontWeight: 400, color: COLORS.textMuted }}>{suffix}</span>}</div>
      {change !== undefined && (
        <div style={{ fontSize: 12, color: change >= 0 ? COLORS.green : COLORS.red, marginTop: 4, fontWeight: 500 }}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs last month
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = COLORS.orange, height = 6, showLabel = false }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height, borderRadius: height / 2, background: COLORS.surfaceAlt, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: height / 2, transition: "width 0.6s ease" }} />
      </div>
      {showLabel && <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 38, textAlign: "right" }}>{Math.round(pct)}%</span>}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
      {tabs.map((t) => <div key={t} style={S.tab(active === t)} onClick={() => onChange(t)}>{t}</div>)}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
      <div onClick={() => onChange && onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? COLORS.orange : COLORS.border, position: "relative", transition: "all 0.2s", cursor: "pointer", flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: value ? 20 : 2, transition: "all 0.2s" }} />
      </div>
      <span style={{ color: COLORS.textMuted }}>{label}</span>
    </label>
  );
}

function ComplianceBadge() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}33` }}>
      <span style={{ color: COLORS.green, fontSize: 12 }}>🛡️</span>
      <span style={{ fontSize: 11, color: COLORS.green, fontWeight: 600 }}>TCPA Compliant</span>
    </div>
  );
}

// FEATURE 5: Performance-based tier suggestion banner
function TierSuggestionBanner({ totalAppts, hasAliv, hasSalesTool, onAction }) {
  let suggestion = null;
  if (!hasAliv && totalAppts >= TIER_THRESHOLDS.suggestAliv) {
    suggestion = { icon: "🚀", color: COLORS.blue, title: "Unlock alīv — New Lead Engine", desc: `You've set ${totalAppts} appointments with riivīv! Based on your success rate, adding alīv could generate ${Math.round(totalAppts * 0.6)} additional appointments per month from new leads. Plus, you'll only pay one maintenance fee.`, action: "Explore alīv", type: "aliv" };
  } else if (hasAliv && !hasSalesTool && totalAppts >= TIER_THRESHOLDS.suggestSales) {
    suggestion = { icon: "📝", color: COLORS.purple, title: "Unlock Automated Sales & Proposals", desc: `With ${totalAppts} qualified appointments, you're leaving revenue on the table. Our AI proposal engine can auto-generate financing options and close deals — a feature no other platform offers. Clients using it see 38% higher close rates.`, action: "Unlock Sales Tool", type: "sales" };
  } else if (totalAppts >= TIER_THRESHOLDS.suggestEnterprise) {
    suggestion = { icon: "👑", color: COLORS.orangeLight, title: "You've Outgrown Your Current Tier", desc: `With ${totalAppts} appointments this month, upgrading to Enterprise would save you $${Math.round(totalAppts * 12)} annually with volume pricing and dedicated AI optimization. Let's talk.`, action: "Upgrade to Enterprise", type: "enterprise" };
  }
  if (!suggestion) return null;
  return (
    <div style={{ padding: 18, borderRadius: 12, background: `${suggestion.color}12`, border: `1px solid ${suggestion.color}33`, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 32 }}>{suggestion.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: suggestion.color, marginBottom: 4 }}>{suggestion.title}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{suggestion.desc}</div>
      </div>
      <button style={S.btn("primary")} onClick={() => onAction && onAction(suggestion.type)}>{suggestion.action}</button>
      <button style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
    </div>
  );
}

// FEATURE 2: Conversation Replay Component
function ConversationReplay({ conversations, leadName, onClose }) {
  const [selectedConvo, setSelectedConvo] = useState(conversations[0] || null);
  const sentimentColors = { very_positive: COLORS.green, positive: COLORS.greenLight, neutral: COLORS.yellow, negative: COLORS.red };
  const outcomeLabels = { appointment_set: "Appointment Set", confirmed: "Confirmed", deferred: "Deferred", no_response: "No Response", declined: "Declined" };
  const outcomeColors = { appointment_set: COLORS.green, confirmed: COLORS.green, deferred: COLORS.yellow, no_response: COLORS.textMuted, declined: COLORS.red };

  if (!conversations.length) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No Conversations Yet</div>
      <div style={{ fontSize: 13, color: COLORS.textMuted }}>AI conversations with {leadName} will appear here as they happen.</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {conversations.map((c) => (
          <div key={c.id} onClick={() => setSelectedConvo(c)} style={{
            padding: "10px 16px", borderRadius: 8, cursor: "pointer", flexShrink: 0,
            border: `1px solid ${selectedConvo?.id === c.id ? COLORS.orange : COLORS.border}`,
            background: selectedConvo?.id === c.id ? COLORS.orangeGlow : "transparent",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {c.type === "voice" ? "📞" : c.type === "sms" ? "💬" : "✉️"} {c.type.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{c.date}</div>
            <div style={{ marginTop: 4 }}><span style={S.badge(outcomeColors[c.outcome] || COLORS.textMuted)}>{outcomeLabels[c.outcome] || c.outcome}</span></div>
          </div>
        ))}
      </div>
      {selectedConvo && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Agent: {selectedConvo.agent}</span>
              {selectedConvo.duration && <span style={S.tag(COLORS.textMuted)}>Duration: {selectedConvo.duration}</span>}
              <span style={S.tag(sentimentColors[selectedConvo.sentiment] || COLORS.textMuted)}>Sentiment: {selectedConvo.sentiment}</span>
            </div>
            <span style={S.badge(outcomeColors[selectedConvo.outcome])}>{outcomeLabels[selectedConvo.outcome]}</span>
          </div>
          <div style={{ background: COLORS.surfaceAlt, borderRadius: 10, padding: 16, maxHeight: 360, overflowY: "auto" }}>
            {selectedConvo.transcript.map((msg, i) => (
              <div key={i} style={{
                display: "flex", flexDirection: msg.role === "agent" ? "row" : "row-reverse",
                marginBottom: 12,
              }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  background: msg.role === "agent" ? `${COLORS.orange}20` : `${COLORS.blue}20`,
                  borderBottomLeft: msg.role === "agent" ? "2px" : "12px",
                  borderBottomRight: msg.role === "agent" ? "12px" : "2px",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: msg.role === "agent" ? COLORS.orange : COLORS.blue, marginBottom: 4, textTransform: "uppercase" }}>
                    {msg.role === "agent" ? `🤖 ${selectedConvo.agent} (AI)` : `👤 ${leadName}`}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, background: COLORS.orangeGlow, borderRadius: 8, border: `1px solid ${COLORS.orange}33` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.orangeLight, marginBottom: 4 }}>🧠 AI Analysis</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              {selectedConvo.outcome === "appointment_set"
                ? "Successful conversion. The agent used value-first positioning, addressed implicit concerns proactively, and offered exactly 2 appointment options per protocol. Talk track effectiveness: High."
                : selectedConvo.outcome === "confirmed"
                ? "Confirmation call executed well. Agent disclosed AI identity (TCPA compliant), confirmed details, and captured additional prep notes for the sales rep."
                : selectedConvo.outcome === "deferred"
                ? "Lead expressed timing concern. Recommend re-engagement in 2-3 weeks with updated market data. Tone was receptive — not a firm no. Score maintained."
                : "No engagement detected. Consider switching channel (voice → SMS) or adjusting time of outreach. Lead may respond better to evening contact."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// FEATURE 3: Lead Score Decay Visualization
function LeadScoreDecayPanel({ lead }) {
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const decayData = months.map((m, i) => {
    const decay = Math.max(0, lead.baseScore + (lead.decayRate * i));
    const boost = i >= 5 ? lead.marketBoost : 0;
    return { month: m, score: Math.min(100, Math.round(decay + boost)), boost };
  });

  return (
    <div style={{ padding: 16, background: COLORS.surfaceAlt, borderRadius: 10, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>📉 Score Decay Model</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          <span style={{ color: COLORS.textMuted }}>Base: <strong style={{ color: COLORS.text }}>{lead.baseScore}</strong></span>
          <span style={{ color: COLORS.textMuted }}>Decay: <strong style={{ color: COLORS.red }}>{lead.decayRate}/mo</strong></span>
          {lead.marketBoost > 0 && <span style={{ color: COLORS.textMuted }}>Market Boost: <strong style={{ color: COLORS.green }}>+{lead.marketBoost}</strong></span>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={decayData}>
          <defs>
            <linearGradient id="decayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.orange} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.orange} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" stroke={COLORS.textDim} fontSize={10} />
          <YAxis domain={[0, 100]} stroke={COLORS.textDim} fontSize={10} />
          <Area type="monotone" dataKey="score" stroke={COLORS.orange} fill="url(#decayGrad)" strokeWidth={2} />
          <Tooltip contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 11 }} />
        </AreaChart>
      </ResponsiveContainer>
      {lead.marketBoost > 0 && (
        <div style={{ fontSize: 11, color: COLORS.green, marginTop: 6 }}>
          ⚡ Market boost applied: Utility rates in this area increased 12% → Score boosted +{lead.marketBoost} pts
        </div>
      )}
      {lead.decayRate < -2.5 && (
        <div style={{ fontSize: 11, color: COLORS.red, marginTop: 6 }}>
          ⚠️ Rapid decay detected. Recommend immediate re-engagement before score drops below revival threshold.
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOGIN
// ============================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("demo@leviosai.com");
  const [pass, setPass] = useState("catalyst2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await auth.login(email, pass);
      setToken(res.token);
      onLogin(res.user);
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 30% 20%, ${COLORS.orangeGlow}, transparent 60%), ${COLORS.bg}` }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "48px 40px", width: 400, textAlign: "center" }}>
        <Logo />
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "12px 0 32px", lineHeight: 1.5 }}>Agentic AI Sales & Lead Revival Platform</p>
        {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: `${COLORS.red}22`, color: COLORS.red, fontSize: 12, marginBottom: 16 }}>{error}</div>}
        <div style={{ textAlign: "left", marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>Email</label>
          <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
        </div>
        <div style={{ textAlign: "left", marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>Password</label>
          <input style={S.input} type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
        </div>
        <button style={{ ...S.btn("primary"), width: "100%", padding: "12px 20px", fontSize: 14, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p style={{ color: COLORS.textDim, fontSize: 11, marginTop: 20 }}>Powered by <span style={{ color: COLORS.orange }}>Leviosai, Inc.</span> — Part of The Reaction Stack</p>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD — with Features 1, 3, 5
// ============================================================
function DashboardPage({ setPage }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    dashboard.getStats().then(setStats).catch(console.error);
    activityApi.list({ limit: 7 }).then(setActivity).catch(console.error);
  }, []);

  const totalAppts = stats?.upcomingAppointments?.length || 0;
  const revivalData = [
    { month: "Oct", revived: 45, appts: 15, closed: 4 },
    { month: "Nov", revived: 62, appts: 21, closed: 7 },
    { month: "Dec", revived: 58, appts: 19, closed: 8 },
    { month: "Jan", revived: 78, appts: 26, closed: 11 },
    { month: "Feb", revived: 91, appts: 30, closed: 13 },
    { month: "Mar", revived: 104, appts: 34, closed: 16 },
  ];
  const channelData = [
    { name: "Voice AI", value: 38 }, { name: "SMS/Text", value: 35 },
    { name: "Email", value: 22 }, { name: "Omnichannel", value: 5 },
  ];
  const channelColors = [COLORS.orange, COLORS.blue, COLORS.green, COLORS.purple];
  const recentActivity = [
    { time: "2 min ago", action: "Voice AI set appointment", lead: "Robert Taylor", result: "success" },
    { time: "18 min ago", action: "SMS revived lead", lead: "David Chen", result: "success" },
    { time: "34 min ago", action: "Email follow-up sent", lead: "Michael Brown", result: "pending" },
    { time: "1 hr ago", action: "No-show detected — $200 credit applied", lead: "Marcus Johnson", result: "credit" },
    { time: "1.5 hrs ago", action: "New lead scraped & qualified", lead: "Jennifer Adams", result: "success" },
    { time: "2 hrs ago", action: "Proposal viewed by customer", lead: "Sandra Wilson", result: "success" },
    { time: "3 hrs ago", action: "Lead score boosted +5 (market change)", lead: "David Chen", result: "boost" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h2>
        <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Welcome back. Here's your performance overview.</p>
      </div>

      {/* FEATURE 5: Performance tier suggestion */}
      <TierSuggestionBanner totalAppts={totalAppts} hasAliv={true} hasSalesTool={false} onAction={(t) => setPage(t === "sales" ? "Proposals & Sales" : "Billing")} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Leads" value={stats?.totalLeads || 0} color={COLORS.orange} icon="🔥" />
        <StatCard label="Hot Leads" value={stats?.hotLeads || 0} color={COLORS.green} icon="📅" />
        <StatCard label="Won Deals" value={stats?.wonDeals || 0} color={COLORS.blue} icon="📈" />
        <StatCard label="Pipeline Value" value={`$${((stats?.pipelineValue || 0) / 1000).toFixed(0)}K`} color={COLORS.teal} icon="💰" />
        <StatCard label="Won Revenue" value={`$${((stats?.wonRevenue || 0) / 1000).toFixed(0)}K`} color={COLORS.yellow} icon="💸" />
        <StatCard label="Show-Up Rate" value="87" suffix="%" change={3.2} color={COLORS.purple} icon="✅" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={S.card}>
          <div style={S.cardHeader}><span>Revival & Appointment Trends</span><span style={{ fontSize: 11, color: COLORS.textMuted }}>Last 6 months</span></div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revivalData}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.orange} stopOpacity={0.3} /><stop offset="100%" stopColor={COLORS.orange} stopOpacity={0} /></linearGradient>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.green} stopOpacity={0.3} /><stop offset="100%" stopColor={COLORS.green} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="month" stroke={COLORS.textDim} fontSize={11} />
              <YAxis stroke={COLORS.textDim} fontSize={11} />
              <Tooltip contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="revived" stroke={COLORS.orange} fill="url(#gR)" strokeWidth={2} name="Revived" />
              <Area type="monotone" dataKey="appts" stroke={COLORS.green} fill="url(#gA)" strokeWidth={2} name="Appts Set" />
              <Line type="monotone" dataKey="closed" stroke={COLORS.purple} strokeWidth={2} dot={{ r: 3 }} name="Deals Closed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.cardHeader}>Outreach Channels</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={channelData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">{channelData.map((_, i) => <Cell key={i} fill={channelColors[i]} />)}</Pie><Tooltip contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {channelData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: channelColors[i] }} /><span style={{ color: COLORS.textMuted }}>{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={S.card}>
          <div style={S.cardHeader}><span>Recent Activity</span><span style={{ fontSize: 12, color: COLORS.orange, cursor: "pointer" }} onClick={() => setPage("Conversation Replay")}>View All →</span></div>
          {recentActivity.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < recentActivity.length - 1 ? `1px solid ${COLORS.border}22` : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                background: a.result === "success" ? COLORS.green : a.result === "credit" ? COLORS.yellow : a.result === "boost" ? COLORS.teal : a.result === "declined" ? COLORS.red : COLORS.yellow }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{a.action}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{a.lead} · {a.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}><span>Goal Tracking</span><ComplianceBadge /></div>
          {[
            { label: "Lead Revival Rate", current: 15.2, target: 15, color: COLORS.green, met: true },
            { label: "Revived → Appt Set", current: 32.7, target: 33, color: COLORS.orange, met: false },
            { label: "Monthly Appt Target", current: 34, target: 40, color: COLORS.blue, met: false },
            { label: "Show-Up Rate", current: 87, target: 80, color: COLORS.teal, met: true },
          ].map((g, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>{g.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.orange }}>{g.current}{typeof g.target === "number" && g.target <= 100 ? "%" : ""} / {g.target}{typeof g.target === "number" && g.target <= 100 ? "%" : ""}</span>
              </div>
              <ProgressBar value={g.current} max={g.target} color={g.color} height={8} />
              <div style={{ fontSize: 11, color: g.met ? COLORS.green : COLORS.yellow, marginTop: 4 }}>{g.met ? "✓ Goal exceeded" : "⟳ In progress"}</div>
            </div>
          ))}
          {/* FEATURE 1: Show-up guarantee highlight */}
          <div style={{ marginTop: 12, padding: 14, background: `${COLORS.teal}12`, borderRadius: 8, border: `1px solid ${COLORS.teal}33` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.teal, marginBottom: 4 }}>🛡️ Show-Up Guarantee Active</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              3 no-shows this month → $600 in credits applied to your invoice. You only pay full price for appointments that happen.
            </div>
          </div>
          <div style={{ marginTop: 12, padding: 14, background: COLORS.orangeGlow, borderRadius: 8, border: `1px solid ${COLORS.orange}33` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.orangeLight, marginBottom: 4 }}>💡 AI Suggestion</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              {/* FEATURE 3: Score decay intelligence */}
              4 leads have scores decaying rapidly. Market conditions (utility rate hike +12%) triggered score boosts for 8 leads in your area. Recommend immediate outreach to these re-scored leads for optimal revival window.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LEADS — with Features 2, 3
// ============================================================
function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showReplay, setShowReplay] = useState(false);

  const statusMap = { "New": "new", "Dead": "lost", "Aged": "contacted", "Revived": "qualified", "Appointment Set": "proposal" };
  const statusLabelMap = { "new": "New", "lost": "Dead", "contacted": "Aged", "qualified": "Revived", "proposal": "Appointment Set", "won": "Revived" };

  const fetchLeads = useCallback(() => {
    const filters = {};
    if (filter !== "All" && statusMap[filter]) filters.status = statusMap[filter];
    if (search) filters.search = search;
    leadsApi.list(filters).then((data) => {
      setLeads(data.map(l => ({
        ...l,
        name: `${l.firstName} ${l.lastName}`,
        status: statusLabelMap[l.status] || l.status,
        score: l.aiScore || 0,
        baseScore: l.aiScore || 50,
        decayRate: -1.5,
        marketBoost: 0,
        conversations: [],
        source: l.source || "—",
        lastContact: l.lastContactedAt ? new Date(l.lastContactedAt).toISOString().split("T")[0] : "—",
      })));
    }).catch(console.error);
  }, [filter, search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const statusColors = { "Dead": COLORS.red, "Aged": COLORS.yellow, "Revived": COLORS.blue, "New": COLORS.green, "Appointment Set": COLORS.purple };
  const filters = ["All", "Dead", "Aged", "Revived", "New", "Appointment Set"];
  const filtered = leads.filter(l => (filter === "All" || l.status === filter) && (l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Lead Management</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>{leads.length} total · {leads.filter(l => l.status === "Appointment Set").length} appts set · {leads.filter(l => l.marketBoost > 0).length} market-boosted</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btn("secondary")} onClick={() => setShowUpload(true)}>📤 Import Leads</button>
          <button style={S.btn("primary")}>+ Add Lead</button>
        </div>
      </div>

      {/* FEATURE 3: Decay alert banner */}
      <div style={{ padding: 14, borderRadius: 10, background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}33`, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>📉</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.red }}>Rapid Score Decay Alert</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>{leads.filter(l => l.decayRate < -2.5).length} leads losing score rapidly. Auto-engagement recommended before they drop below revival threshold.</div>
        </div>
        <button style={{ ...S.btn("primary"), padding: "8px 16px", fontSize: 12 }}>Auto-Engage All</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ ...S.input, maxWidth: 280 }} placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <TabBar tabs={filters} active={filter} onChange={setFilter} />
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Name</th><th style={S.th}>Contact</th><th style={S.th}>Source</th><th style={S.th}>Status</th>
            <th style={S.th}>Score</th><th style={S.th}>Decay</th><th style={S.th}>Convos</th><th style={S.th}>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} style={{ cursor: "pointer" }} onClick={() => setSelectedLead(l)}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{l.name}</span></td>
                <td style={S.td}><div style={{ fontSize: 12 }}>{l.phone}</div><div style={{ fontSize: 11, color: COLORS.textMuted }}>{l.email}</div></td>
                <td style={S.td}><span style={S.tag(COLORS.textMuted)}>{l.source}</span></td>
                <td style={S.td}><span style={S.badge(statusColors[l.status] || COLORS.textMuted)}>{l.status}</span></td>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ProgressBar value={l.score} color={l.score > 75 ? COLORS.green : l.score > 50 ? COLORS.yellow : COLORS.red} />
                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 24 }}>{l.score}</span>
                    {l.marketBoost > 0 && <span style={{ fontSize: 10, color: COLORS.green }}>⚡+{l.marketBoost}</span>}
                  </div>
                </td>
                {/* FEATURE 3: Decay indicator */}
                <td style={S.td}>
                  {l.decayRate < 0 ? (
                    <span style={{ fontSize: 12, color: l.decayRate < -2.5 ? COLORS.red : COLORS.yellow, fontWeight: 600 }}>
                      {l.decayRate}/mo {l.decayRate < -2.5 ? "⚠️" : ""}
                    </span>
                  ) : <span style={{ fontSize: 12, color: COLORS.green }}>Stable</span>}
                </td>
                {/* FEATURE 2: Conversation count */}
                <td style={S.td}>
                  <span style={{ ...S.tag(l.conversations.length > 0 ? COLORS.blue : COLORS.textDim), cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); setSelectedLead(l); setShowReplay(true); }}>
                    💬 {l.conversations.length}
                  </span>
                </td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button style={{ ...S.btn("ghost"), padding: "5px 10px", fontSize: 11 }} onClick={async () => {
                      try { await messagingApi.initiateCall(l.id); alert("Call initiated!"); } catch (e) { alert(e.message); }
                    }}>📞</button>
                    <button style={{ ...S.btn("ghost"), padding: "5px 10px", fontSize: 11 }} onClick={async () => {
                      const msg = prompt(`SMS to ${l.name}:`);
                      if (msg) { try { await messagingApi.sendSMS(l.id, msg); alert("SMS sent!"); } catch (e) { alert(e.message); } }
                    }}>💬</button>
                    <button style={{ ...S.btn("ghost"), padding: "5px 10px", fontSize: 11 }} onClick={async () => {
                      const subject = prompt(`Email subject for ${l.name}:`);
                      if (!subject) return;
                      const body = prompt("Email body:");
                      if (body) { try { await messagingApi.sendEmail(l.id, subject, body); alert("Email sent!"); } catch (e) { alert(e.message); } }
                    }}>✉️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={S.modal} onClick={() => setShowUpload(false)}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Import Leads</h3>
            <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>Upload your leads via file or connect a CRM to sync automatically.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { icon: "📄", title: "CSV / Excel File", desc: "Upload .csv, .xlsx, or .xls" },
                { icon: "📸", title: "Screenshot / Image", desc: "AI extracts lead data from images" },
                { icon: "☁️", title: "CRM Sync", desc: "Import from connected CRM" },
                { icon: "📋", title: "Paste Data", desc: "Copy/paste from any source" },
              ].map((opt, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${COLORS.border}`, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.orange; e.currentTarget.style.background = COLORS.orangeGlow; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 20, borderRadius: 10, border: `2px dashed ${COLORS.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>Drag & drop files here or <span style={{ color: COLORS.orange, textDecoration: "underline" }}>browse</span></div>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>Supports CSV, XLSX, XLS, PNG, JPG, PDF</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button style={S.btn("ghost")} onClick={() => setShowUpload(false)}>Cancel</button>
              <button style={S.btn("primary")}>Upload & Process</button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal — with Features 2 & 3 */}
      {selectedLead && (
        <div style={S.modal} onClick={() => { setSelectedLead(null); setShowReplay(false); }}>
          <div style={{ ...S.modalContent, maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{selectedLead.name}</h3>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span style={S.badge(statusColors[selectedLead.status])}>{selectedLead.status}</span>
                  <span style={S.tag(COLORS.textMuted)}>{selectedLead.source}</span>
                  <span style={S.tag(COLORS.blue)}>💬 {selectedLead.conversations.length} conversations</span>
                </div>
              </div>
              <button style={{ ...S.btn("ghost"), padding: "6px 10px" }} onClick={() => { setSelectedLead(null); setShowReplay(false); }}>✕</button>
            </div>

            <TabBar tabs={["Details", "Conversation Replay", "Score Analysis"]} active={showReplay ? "Conversation Replay" : "Details"} onChange={(t) => setShowReplay(t === "Conversation Replay")} />

            {!showReplay && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div><div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Phone</div><div style={{ fontSize: 14 }}>{selectedLead.phone}</div></div>
                  <div><div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Email</div><div style={{ fontSize: 14 }}>{selectedLead.email}</div></div>
                  <div><div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Industry</div><div style={{ fontSize: 14 }}>{selectedLead.industry}</div></div>
                  <div><div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Lead Score</div><div style={{ fontSize: 14, fontWeight: 700, color: selectedLead.score > 75 ? COLORS.green : COLORS.orange }}>{selectedLead.score}/100 {selectedLead.marketBoost > 0 && <span style={{ fontSize: 11, color: COLORS.green }}>⚡+{selectedLead.marketBoost} boost</span>}</div></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>AI Notes</div>
                  <div style={{ padding: 14, borderRadius: 8, background: COLORS.surfaceAlt, fontSize: 13, lineHeight: 1.6 }}>{selectedLead.notes}</div>
                </div>
                {/* FEATURE 3: Score decay mini-chart */}
                <LeadScoreDecayPanel lead={selectedLead} />
                <div style={{ padding: 14, borderRadius: 8, background: COLORS.orangeGlow, border: `1px solid ${COLORS.orange}33`, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.orangeLight, marginBottom: 6 }}>🤖 AI Recommended Action</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                    {selectedLead.score > 75
                      ? "High intent detected. Recommend immediate voice AI outreach with appointment offer. Offer 2 appointment times within the next 48 hours."
                      : selectedLead.score > 50
                      ? `Moderate interest. Score has decayed ${Math.abs(selectedLead.baseScore - selectedLead.score)} points since initial contact. Recommend multi-touch sequence: personalized SMS → email with value prop → voice follow-up in 3 days.`
                      : `Low engagement. Score decaying at ${selectedLead.decayRate}/mo. ${selectedLead.marketBoost > 0 ? "Market conditions have boosted score — window of opportunity is NOW." : "Start with soft-touch email re-engagement highlighting new incentives."}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={S.btn("primary")} onClick={async () => {
                    try { const r = await messagingApi.initiateCall(selectedLead.id); alert(r.twilioConfigured ? `Call initiated! SID: ${r.call.sid}` : "Call logged. Configure Twilio in .env to make real calls."); } catch (e) { alert(e.message); }
                  }}>📞 Voice AI Call</button>
                  <button style={S.btn("secondary")} onClick={async () => {
                    try {
                      const gen = await aiApi.generateMessage(selectedLead.id, "sms");
                      const msg = prompt("AI-generated SMS (edit if needed):", gen.message);
                      if (msg) { await messagingApi.sendSMS(selectedLead.id, msg, true); alert("SMS sent!"); fetchLeads(); }
                    } catch (e) { alert(e.message); }
                  }}>💬 Send SMS</button>
                  <button style={S.btn("secondary")} onClick={async () => {
                    try {
                      const gen = await aiApi.generateMessage(selectedLead.id, "email");
                      const subject = prompt("Subject:", gen.subject || "Following up");
                      if (!subject) return;
                      const body = prompt("Email body (AI-generated, edit if needed):", gen.message);
                      if (body) { await messagingApi.sendEmail(selectedLead.id, subject, body, true); alert("Email sent!"); fetchLeads(); }
                    } catch (e) { alert(e.message); }
                  }}>✉️ Send Email</button>
                  <button style={S.btn("teal")} onClick={async () => {
                    try { const r = await aiApi.scoreLead(selectedLead.id); alert(`AI Score: ${r.score}/100 | Temp: ${r.temperature}\n${r.reasoning}`); fetchLeads(); setSelectedLead(null); } catch (e) { alert(e.message); }
                  }}>🧠 AI Score</button>
                  <button style={S.btn("success")}>📅 Set Appointment</button>
                </div>
              </>
            )}

            {/* FEATURE 2: Full Conversation Replay */}
            {showReplay && <ConversationReplay conversations={selectedLead.conversations} leadName={selectedLead.name} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CAMPAIGNS
// ============================================================
function CampaignsPage() {
  const [activeProduct, setActiveProduct] = useState("riiviv");
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const campaigns = {
    riiviv: [
      { id: 1, name: "Solar Q1 Dead Lead Blast", status: "Active", leads: 842, contacted: 714, revived: 107, appts: 36, channel: "Omni", started: "2026-01-15" },
      { id: 2, name: "HVAC Winter Recovery", status: "Active", leads: 456, contacted: 389, revived: 62, appts: 21, channel: "Voice + SMS", started: "2026-02-01" },
      { id: 3, name: "Roofing Aged Leads — Feb", status: "Completed", leads: 320, contacted: 298, revived: 48, appts: 16, channel: "SMS + Email", started: "2026-02-10" },
    ],
    aliv: [
      { id: 4, name: "Solar New Homeowner Scrub", status: "Active", leads: 1250, contacted: 430, revived: 0, appts: 52, channel: "Web Scrub + Voice", started: "2026-03-01" },
      { id: 5, name: "Insurance Inbound Qualifier", status: "Active", leads: 680, contacted: 512, revived: 0, appts: 88, channel: "Omnichannel", started: "2026-02-15" },
    ],
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>AI Campaigns</h2><p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Manage your riivīv and alīv AI agent campaigns</p></div>
        <button style={S.btn("primary")} onClick={() => setShowNewCampaign(true)}>+ New Campaign</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { key: "riiviv", label: "riivīv", desc: "Dead & Aged Lead Revival Engine", stat1: "217", s1l: "Revived", stat2: "73", s2l: "Appts Set", color: COLORS.orange },
          { key: "aliv", label: "alīv", desc: "New Lead to Appointment Engine", stat1: "1,930", s1l: "Leads Found", stat2: "140", s2l: "Appts Set", color: COLORS.blue },
        ].map((p) => (
          <div key={p.key} onClick={() => setActiveProduct(p.key)} style={{
            flex: 1, padding: 20, borderRadius: 12, cursor: "pointer",
            border: `1px solid ${activeProduct === p.key ? p.color : COLORS.border}`,
            background: activeProduct === p.key ? `${p.color}15` : COLORS.surface, transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: activeProduct === p.key ? p.color : COLORS.text, marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>{p.desc}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: p.color }}>{p.stat1}</div><div style={{ fontSize: 10, color: COLORS.textMuted }}>{p.s1l}</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.green }}>{p.stat2}</div><div style={{ fontSize: 10, color: COLORS.textMuted }}>{p.s2l}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><span>{activeProduct === "riiviv" ? "riivīv" : "alīv"} Campaigns</span><ComplianceBadge /></div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Campaign</th><th style={S.th}>Status</th><th style={S.th}>Leads</th><th style={S.th}>Contacted</th>{activeProduct === "riiviv" && <th style={S.th}>Revived</th>}<th style={S.th}>Appts</th><th style={S.th}>Channel</th><th style={S.th}>Started</th></tr></thead>
          <tbody>
            {campaigns[activeProduct].map((c) => (
              <tr key={c.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{c.name}</span></td>
                <td style={S.td}><span style={S.badge(c.status === "Active" ? COLORS.green : COLORS.textMuted)}>{c.status}</span></td>
                <td style={S.td}>{c.leads.toLocaleString()}</td>
                <td style={S.td}>{c.contacted.toLocaleString()}</td>
                {activeProduct === "riiviv" && <td style={S.td}><span style={{ fontWeight: 600, color: COLORS.orange }}>{c.revived}</span></td>}
                <td style={S.td}><span style={{ fontWeight: 600, color: COLORS.green }}>{c.appts}</span></td>
                <td style={S.td}><span style={S.tag(COLORS.textMuted)}>{c.channel}</span></td>
                <td style={S.td}><span style={{ fontSize: 12, color: COLORS.textMuted }}>{c.started}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNewCampaign && (
        <div style={S.modal} onClick={() => setShowNewCampaign(false)}>
          <div style={{ ...S.modalContent, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Create New Campaign</h3>
            <div style={{ display: "grid", gap: 16 }}>
              <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Campaign Name</label><input style={S.input} placeholder="e.g., Solar Spring Revival" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Product</label><select style={{ ...S.select, width: "100%" }}><option>riivīv — Lead Revival</option><option>alīv — New Leads</option></select></div>
                <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Industry</label><select style={{ ...S.select, width: "100%" }}>{INDUSTRIES.map((ind) => <option key={ind}>{ind}</option>)}</select></div>
              </div>
              <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Voice Agent</label><select style={{ ...S.select, width: "100%" }}>{VOICE_OPTIONS.map((v) => <option key={v.id}>{v.name} — {v.tone} ({v.accent})</option>)}</select></div>
              <div style={{ padding: 14, background: COLORS.orangeGlow, borderRadius: 8, border: `1px solid ${COLORS.orange}33` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.orangeLight, marginBottom: 6 }}>🛡️ Compliance</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Toggle value={true} label="TCPA consent verification" /><Toggle value={true} label="DNC scrubbing" /><Toggle value={true} label="AI disclosure at call start" /><Toggle value={true} label="Quiet hours (8am-9pm local)" />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button style={S.btn("ghost")} onClick={() => setShowNewCampaign(false)}>Cancel</button>
              <button style={S.btn("primary")}>Launch Campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// APPOINTMENTS — with Feature 1 (Show-Up Guarantee)
// ============================================================
function AppointmentsPage() {
  const [apptData, setApptData] = useState([]);
  useEffect(() => {
    appointmentsApi.list().then((data) => {
      setApptData(data.map(a => ({
        id: a.id,
        lead: `${a.leadFirstName || ""} ${a.leadLastName || ""}`.trim() || a.title,
        date: new Date(a.scheduledAt).toISOString().split("T")[0],
        time: new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "Consultation",
        rep: "TBD",
        status: a.status === "scheduled" ? "Confirmed" : a.status === "completed" ? "Completed" : a.status,
        product: "—",
        showed: a.status === "completed" ? true : null,
        creditApplied: false,
      })));
    }).catch(console.error);
  }, []);
  const [appointments, setAppointments] = useState([]);
  useEffect(() => { if (apptData.length) setAppointments(apptData); }, [apptData]);
  const [showGuaranteeInfo, setShowGuaranteeInfo] = useState(false);

  const toggleShowUp = (id, showed) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, showed, creditApplied: !showed, status: "Completed" } : a));
  };

  const noShows = appointments.filter(a => a.showed === false);
  const totalCredits = noShows.length * 200;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Appointments</h2><p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>{appointments.length} total · {noShows.length} no-shows · ${totalCredits} in credits</p></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="This Week" value="5" color={COLORS.green} icon="📅" />
        <StatCard label="This Month" value="34" color={COLORS.orange} icon="📊" />
        <StatCard label="Show Rate" value="87" suffix="%" color={COLORS.teal} icon="✅" />
        <StatCard label="No-Show Credits" value={`$${totalCredits}`} color={COLORS.yellow} icon="💸" />
        <StatCard label="Close Rate" value="42" suffix="%" color={COLORS.purple} icon="🏆" />
      </div>

      {/* FEATURE 1: Show-Up Guarantee Banner */}
      <div style={{ padding: 18, borderRadius: 12, background: `${COLORS.teal}10`, border: `1px solid ${COLORS.teal}33`, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 32 }}>🛡️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.teal }}>Show-Up Guarantee Active</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
            You pay $400/$500 per appointment set. If a prospect doesn't show, you receive a <strong style={{ color: COLORS.teal }}>$200 credit</strong> automatically applied to your next invoice. {noShows.length} no-shows this month = <strong style={{ color: COLORS.teal }}>${totalCredits} in credits</strong>.
          </div>
        </div>
        <button style={S.btn("ghost")} onClick={() => setShowGuaranteeInfo(true)}>Details</button>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><span>All Appointments</span>
          <div style={{ display: "flex", gap: 8 }}>
            <select style={S.select}><option>All Reps</option><option>Mike Torres</option><option>Sarah Kim</option><option>Round Robin</option></select>
          </div>
        </div>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Lead</th><th style={S.th}>Date & Time</th><th style={S.th}>Type</th><th style={S.th}>Rep</th><th style={S.th}>Product</th><th style={S.th}>Status</th><th style={S.th}>Showed?</th><th style={S.th}>Credit</th>
          </tr></thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{a.lead}</span></td>
                <td style={S.td}><div style={{ fontSize: 13 }}>{a.date}</div><div style={{ fontSize: 12, color: COLORS.orange, fontWeight: 600 }}>{a.time}</div></td>
                <td style={S.td}><span style={S.tag(COLORS.textMuted)}>{a.type}</span></td>
                <td style={S.td}>{a.rep}</td>
                <td style={S.td}>{a.product}</td>
                <td style={S.td}><span style={S.badge(a.status === "Confirmed" ? COLORS.green : a.status === "Completed" ? COLORS.blue : COLORS.yellow)}>{a.status}</span></td>
                {/* FEATURE 1: Show-up tracking */}
                <td style={S.td}>
                  {a.status === "Completed" ? (
                    a.showed === true ? <span style={{ color: COLORS.green, fontWeight: 600 }}>✓ Yes</span> :
                    a.showed === false ? <span style={{ color: COLORS.red, fontWeight: 600 }}>✗ No-Show</span> :
                    <span style={{ color: COLORS.textMuted }}>—</span>
                  ) : a.status === "Confirmed" || a.status === "Pending" ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ ...S.btn("success"), padding: "4px 10px", fontSize: 11 }} onClick={() => toggleShowUp(a.id, true)}>✓</button>
                      <button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11 }} onClick={() => toggleShowUp(a.id, false)}>✗</button>
                    </div>
                  ) : <span style={{ color: COLORS.textMuted }}>—</span>}
                </td>
                <td style={S.td}>
                  {a.creditApplied ? <span style={S.badge(COLORS.teal)}>$200 Credit</span> : <span style={{ color: COLORS.textDim }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scheduling config card */}
      <div style={S.card}>
        <div style={S.cardHeader}>Calendar & Scheduling Settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Scheduling Mode</div>
            {["Round Robin (rotate evenly)", "First Available Rep", "Specific Rep Assignment", "Weighted Distribution"].map((mode, i) => (
              <label key={mode} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, cursor: "pointer", fontSize: 13, background: i === 0 ? COLORS.orangeGlow : "transparent", marginBottom: 8 }}>
                <input type="radio" name="schedMode" defaultChecked={i === 0} /> {mode}
              </label>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>AI Appointment Strategy</div>
            <div style={{ padding: 14, background: COLORS.surfaceAlt, borderRadius: 8, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
              AI offers <strong style={{ color: COLORS.orangeLight }}>2 specific time slots first</strong>, optimized for prospect availability and rep calendars. If neither works: "What time works best for you this week?"
            </div>
            <Toggle value={true} label="Auto-send confirmation text + email" />
            <div style={{ marginTop: 8 }}><Toggle value={true} label="24-hour reminder" /></div>
            <div style={{ marginTop: 8 }}><Toggle value={true} label="Same-day morning reminder" /></div>
            <div style={{ marginTop: 8 }}><Toggle value={true} label="Post-appointment show-up tracking" /></div>
          </div>
        </div>
      </div>

      {showGuaranteeInfo && (
        <div style={S.modal} onClick={() => setShowGuaranteeInfo(false)}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🛡️ Show-Up Guarantee Program</h3>
            <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.8 }}>
              <p><strong style={{ color: COLORS.text }}>How it works:</strong></p>
              <p>• You pay the standard per-appointment fee ($400 riivīv / $500 alīv) for every appointment set by our AI agents.</p>
              <p>• If the prospect <strong style={{ color: COLORS.red }}>does not show up</strong>, you automatically receive a <strong style={{ color: COLORS.teal }}>$200 credit</strong> on your next invoice.</p>
              <p>• Credits are tracked in real-time and appear on your monthly billing statement.</p>
              <p>• Mark appointments as "Showed" or "No-Show" directly in the Appointments table, or our AI can auto-detect from your calendar.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: COLORS.text }}>This month's summary:</strong></p>
              <p>• Total appointments: {appointments.filter(a => a.status === "Completed").length} completed</p>
              <p>• No-shows: {noShows.length}</p>
              <p>• Credits earned: <strong style={{ color: COLORS.teal }}>${totalCredits}</strong></p>
            </div>
            <button style={{ ...S.btn("primary"), marginTop: 20, width: "100%" }} onClick={() => setShowGuaranteeInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROPOSALS — with Feature 4 (White-Label)
// ============================================================
function ProposalsPage() {
  const [unlocked, setUnlocked] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [whiteLabel, setWhiteLabel] = useState({ companyName: "SunPower Solar Solutions", primaryColor: "#e67e22", logoUploaded: true });

  if (!unlocked) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Automated Sales & Proposals</h2>
      <p style={{ color: COLORS.textMuted, fontSize: 14, maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.6 }}>Unlock AI-powered proposal generation, multi-option financing, and automated deal closing — a feature no other platform offers.</p>
      <button style={S.btn("primary")} onClick={() => setUnlocked(true)}>Unlock Feature — Contact Sales</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Proposals & Sales</h2><p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>AI-powered proposals with white-label branding</p></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={S.badge(COLORS.purple)}>✨ Premium Feature</span>
          <button style={S.btn("primary")}>+ New Proposal</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Proposals Sent" value="18" color={COLORS.orange} icon="📝" />
        <StatCard label="Viewed" value="14" color={COLORS.blue} icon="👁️" />
        <StatCard label="Accepted" value="8" color={COLORS.green} icon="✅" />
        <StatCard label="Revenue Closed" value="$186K" color={COLORS.purple} icon="💰" />
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>Active Proposals</div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>ID</th><th style={S.th}>Customer</th><th style={S.th}>System</th><th style={S.th}>Cash</th><th style={S.th}>Loan/mo</th><th style={S.th}>Lease/mo</th><th style={S.th}>Status</th><th style={S.th}>Actions</th></tr></thead>
          <tbody>
            {SAMPLE_PROPOSALS.map((p) => (
              <tr key={p.id}>
                <td style={S.td}><span style={{ fontWeight: 600, color: COLORS.orange }}>{p.id}</span></td>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{p.customer}</span></td>
                <td style={S.td}>{p.system}</td>
                <td style={S.td}>${p.cashPrice.toLocaleString()}</td>
                <td style={S.td}>${p.loanPayment}/mo</td>
                <td style={S.td}>${p.leasePayment}/mo</td>
                <td style={S.td}><span style={S.badge(p.status === "Viewed" ? COLORS.blue : COLORS.yellow)}>{p.status}</span></td>
                <td style={S.td}><div style={{ display: "flex", gap: 6 }}>
                  <button style={{ ...S.btn("ghost"), padding: "5px 10px", fontSize: 11 }} onClick={() => setSelectedProposal(p)}>View</button>
                  <button style={{ ...S.btn("primary"), padding: "5px 10px", fontSize: 11 }}>Close Deal</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FEATURE 4: White-Label Branding Config */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span>🏷️ White-Label Proposal Branding</span>
          <span style={S.badge(COLORS.green)}>✓ Configured</span>
        </div>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>Proposals are fully branded with your company identity. Catalyst appears only as a subtle "Powered by" footer.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Company Name on Proposals</label>
            <input style={S.input} value={whiteLabel.companyName} onChange={(e) => setWhiteLabel({ ...whiteLabel, companyName: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Brand Color</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={whiteLabel.primaryColor} onChange={(e) => setWhiteLabel({ ...whiteLabel, primaryColor: e.target.value })} style={{ width: 40, height: 36, border: "none", borderRadius: 6, cursor: "pointer" }} />
              <input style={S.input} value={whiteLabel.primaryColor} onChange={(e) => setWhiteLabel({ ...whiteLabel, primaryColor: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Company Logo</label>
            <div style={{ padding: 10, border: `1px solid ${COLORS.border}`, borderRadius: 8, textAlign: "center", fontSize: 12, color: COLORS.green }}>
              {whiteLabel.logoUploaded ? "✓ Logo uploaded" : "Click to upload"}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: COLORS.surfaceAlt, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>Preview: Proposals show <strong style={{ color: COLORS.text }}>{whiteLabel.companyName}</strong> as primary brand, with a small <span style={{ color: COLORS.orangeLight }}>"Powered by Catalyst"</span> footer.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={S.card}>
          <div style={S.cardHeader}>Financing Options</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: "💵", name: "Cash Purchase", enabled: true },
              { icon: "🏦", name: "Loan Financing", enabled: true },
              { icon: "📋", name: "Lease Agreement", enabled: true },
              { icon: "⚡", name: "PPA", enabled: true },
            ].map((opt, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.orangeGlow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 20 }}>{opt.icon}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{opt.name}</span></div>
                <Toggle value={opt.enabled} label="Enabled" />
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardHeader}>External Connections</div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 10, border: `2px dashed ${COLORS.border}`, textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🔗</div><div style={{ fontSize: 13, fontWeight: 600 }}>Link Proposal Tool</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>SolarEdge, Enphase, Aurora, etc.</div>
            </div>
            <div style={{ padding: 16, borderRadius: 10, border: `2px dashed ${COLORS.border}`, textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>📄</div><div style={{ fontSize: 13, fontWeight: 600 }}>Upload Price Sheet</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>PDF, CSV, or Excel pricing</div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 4: White-Labeled Proposal Viewer */}
      {selectedProposal && (
        <div style={S.modal} onClick={() => setSelectedProposal(null)}>
          <div style={{ ...S.modalContent, maxWidth: 700, background: "#fff", color: "#1a1a1a" }} onClick={(e) => e.stopPropagation()}>
            {/* White-labeled header with client branding */}
            <div style={{ textAlign: "center", marginBottom: 24, borderBottom: `3px solid ${whiteLabel.primaryColor}`, paddingBottom: 20 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: whiteLabel.primaryColor }}>{whiteLabel.companyName}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Custom Solar Energy Proposal</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Prepared for {selectedProposal.customer} · {selectedProposal.created}</div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${whiteLabel.primaryColor}15, transparent)`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>☀️ Recommended: {selectedProposal.system}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Annual Savings", value: "$2,840", icon: "💰" },
                  { label: "25-Year Savings", value: "$71,000+", icon: "📈" },
                  { label: "CO₂ Offset", value: "8.2 tons/yr", icon: "🌿" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center", padding: 12, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 18 }}>{s.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: whiteLabel.primaryColor }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { title: "Cash Purchase", price: `$${selectedProposal.cashPrice.toLocaleString()}`, sub: "Best value — full ownership", highlight: true },
                { title: "Loan Financing", price: `$${selectedProposal.loanPayment}/mo`, sub: "25-year warranty included" },
                { title: "Lease", price: `$${selectedProposal.leasePayment}/mo`, sub: "$0 down, maintenance included" },
              ].map((opt, i) => (
                <div key={i} style={{
                  padding: 20, borderRadius: 10, textAlign: "center", cursor: "pointer",
                  border: `2px solid ${opt.highlight ? whiteLabel.primaryColor : "#e0e0e0"}`,
                  background: opt.highlight ? `${whiteLabel.primaryColor}10` : "#fafafa",
                }}>
                  {opt.highlight && <div style={{ fontSize: 10, fontWeight: 700, color: whiteLabel.primaryColor, marginBottom: 8, textTransform: "uppercase" }}>Most Popular</div>}
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{opt.title}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: whiteLabel.primaryColor }}>{opt.price}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{opt.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
              <button style={{ ...S.btn("success"), background: whiteLabel.primaryColor }}>✅ Accept & Pay Deposit</button>
              <button style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${whiteLabel.primaryColor}`, background: "transparent", color: whiteLabel.primaryColor, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>📧 Email to Customer</button>
              <button style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", background: "transparent", color: "#888", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }} onClick={() => setSelectedProposal(null)}>Close</button>
            </div>

            {/* Subtle Catalyst footer */}
            <div style={{ textAlign: "center", paddingTop: 16, borderTop: "1px solid #eee" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.4 }}>
                <svg width={14} height={14} viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,55 78,88 50,68 22,88 32,55 5,35 39,35" fill="#d35400" /></svg>
                <span style={{ fontSize: 10, color: "#999" }}>Powered by Catalyst · Leviosai, Inc.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// VOICE AI
// ============================================================
function VoiceAIPage() {
  const [selectedVoice, setSelectedVoice] = useState("v2");
  const [activeTab, setActiveTab] = useState("Voices");

  return (
    <div>
      <div style={{ marginBottom: 24 }}><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Voice AI Configuration</h2><p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Configure conversational AI agents</p></div>
      <TabBar tabs={["Voices", "Talk Tracks", "Objection Handling", "Compliance"]} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Voices" && (
        <>
          <div style={S.card}>
            <div style={S.cardHeader}>Voice Agents</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {VOICE_OPTIONS.map((v) => (
                <div key={v.id} onClick={() => setSelectedVoice(v.id)} style={{
                  padding: 20, borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${selectedVoice === v.id ? COLORS.orange : COLORS.border}`,
                  background: selectedVoice === v.id ? COLORS.orangeGlow : "transparent",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{v.id === "v5" ? "🎤" : v.gender === "Male" ? "👨‍💼" : "👩‍💼"}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{v.tone}</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>{v.accent}</div>
                  {v.id === "v5" && <button style={{ ...S.btn("secondary"), marginTop: 12, width: "100%", fontSize: 11 }}>Upload Voice Sample</button>}
                </div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardHeader}>Settings</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label style={{ fontSize: 12, color: COLORS.textMuted }}>Speaking Speed</label><input type="range" min="0.5" max="1.5" step="0.1" defaultValue="1.0" style={{ width: "100%" }} /></div>
              <div><label style={{ fontSize: 12, color: COLORS.textMuted }}>Tone Warmth</label><input type="range" min="0" max="10" step="1" defaultValue="7" style={{ width: "100%" }} /></div>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <Toggle value={true} label="Low-latency mode (< 500ms)" /><Toggle value={true} label="Handle interruptions gracefully" />
              <Toggle value={true} label="Detect firm 'No' responses" /><Toggle value={true} label="AI disclosure at call start (TCPA)" />
            </div>
          </div>
        </>
      )}

      {activeTab === "Talk Tracks" && (
        <div style={S.card}>
          <div style={S.cardHeader}><span>Industry Talk Tracks</span><span style={{ fontSize: 11, color: COLORS.green }}>🧠 AI Learning: Active</span></div>
          {[
            { industry: "Solar", opener: "Hi [Name], this is [Agent] calling on behalf of [Company]. I noticed you'd explored going solar a while back — utility rates in your area have gone up about 12% since we last connected, and there are some new incentives that could make this a great time to take another look. Do you have a quick minute?", effectiveness: 78 },
            { industry: "HVAC", opener: "Hi [Name], this is [Agent] with [Company]. With the weather changing, a lot of homeowners are finding now is the perfect time to upgrade. We have some new efficiency rebates. Can I share a couple options?", effectiveness: 72 },
            { industry: "Insurance", opener: "Hi [Name], [Agent] here from [Company]. When we last spoke, you were looking at better coverage at lower premiums. We've partnered with new carriers — worth a quick chat?", effectiveness: 81 },
          ].map((t, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.industry}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: COLORS.textMuted }}>Effectiveness:</span><ProgressBar value={t.effectiveness} color={t.effectiveness > 75 ? COLORS.green : COLORS.orange} showLabel /></div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, fontStyle: "italic", padding: 12, background: COLORS.surfaceAlt, borderRadius: 6 }}>"{t.opener}"</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Objection Handling" && (
        <div style={S.card}>
          <div style={S.cardHeader}><span>Objection Handling</span><span style={{ fontSize: 11, color: COLORS.textMuted }}>Finesse over force</span></div>
          {[
            { obj: '"I\'m not interested."', resp: "I completely understand. Just so I'm not leaving you in the dark — are you aware that [relevant change]? No pressure, but if the timing ever feels right, we'd love to help.", strat: "Acknowledge → Plant seed → Soft close" },
            { obj: '"The cost is too high."', resp: "That's a smart concern. What if I could show you an option where your monthly payment is actually less than what you're currently paying? Worth a quick look?", strat: "Validate → Reframe value → Curiosity close" },
            { obj: '"I need to talk to my spouse."', resp: "Absolutely. Would it help if I set up a quick 15-minute call when you're both available?", strat: "Respect → Include both → Offer convenience" },
            { obj: '"Now\'s not a good time."', resp: "No worries at all. When would be a better time for a quick 5-minute chat? I promise to keep it brief.", strat: "Respect time → Minimize commitment → Future appt" },
            { obj: '"Stop calling me." (firm no)', resp: "[Immediate] I completely understand and I apologize for the inconvenience. I'm removing you from our list right now. Have a great day.", strat: "Instant opt-out → DNC list → TCPA compliant" },
          ].map((o, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.red, marginBottom: 8 }}>{o.obj}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, padding: 12, background: COLORS.surfaceAlt, borderRadius: 6 }}><span style={{ color: COLORS.green }}>AI:</span> "{o.resp}"</div>
              <div style={{ fontSize: 11, color: COLORS.orange, marginTop: 6 }}><strong>Strategy:</strong> {o.strat}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Compliance" && (
        <div style={S.card}>
          <div style={S.cardHeader}><span>TCPA & Compliance</span><ComplianceBadge /></div>
          <div style={{ padding: 16, background: `${COLORS.green}10`, borderRadius: 10, border: `1px solid ${COLORS.green}33` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.green, marginBottom: 8 }}>All Compliance Active</div>
            <div style={{ display: "grid", gap: 8 }}>
              <Toggle value={true} label="Prior Express Written Consent (PEWC)" />
              <Toggle value={true} label="One-to-One consent (FCC Jan 2026)" />
              <Toggle value={true} label="AI voice disclosure at call start" />
              <Toggle value={true} label="National + State DNC scrubbing" />
              <Toggle value={true} label="Quiet hours (8am-9pm local)" />
              <Toggle value={true} label="Instant opt-out on STOP/No" />
              <Toggle value={true} label="Intent-to-opt-out AI detection" />
              <Toggle value={true} label="A2P 10DLC for SMS" />
              <Toggle value={true} label="Full audit trail logging" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CONVERSATION REPLAY (Dedicated Page) — Feature 2
// ============================================================
function ConversationReplayPage() {
  const allConvos = SAMPLE_LEADS.flatMap(l => l.conversations.map(c => ({ ...c, leadName: l.name, leadId: l.id })));
  const [filterType, setFilterType] = useState("All");
  const [selected, setSelected] = useState(null);

  const filtered = filterType === "All" ? allConvos : allConvos.filter(c => c.type === filterType.toLowerCase());
  const sentimentColors = { very_positive: COLORS.green, positive: COLORS.greenLight, neutral: COLORS.yellow, negative: COLORS.red };
  const outcomeLabels = { appointment_set: "Appt Set", confirmed: "Confirmed", deferred: "Deferred", no_response: "No Response", declined: "Declined" };
  const outcomeColors = { appointment_set: COLORS.green, confirmed: COLORS.green, deferred: COLORS.yellow, no_response: COLORS.textMuted, declined: COLORS.red };

  return (
    <div>
      <div style={{ marginBottom: 24 }}><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Conversation Replay</h2><p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Review all AI conversations — learn what works, refine what doesn't</p></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Conversations" value={allConvos.length} color={COLORS.orange} icon="💬" />
        <StatCard label="Appointments Set" value={allConvos.filter(c => c.outcome === "appointment_set").length} color={COLORS.green} icon="📅" />
        <StatCard label="Avg Sentiment" value="Positive" color={COLORS.greenLight} icon="😊" />
        <StatCard label="Success Rate" value="60" suffix="%" color={COLORS.blue} icon="🎯" />
      </div>

      <TabBar tabs={["All", "Voice", "SMS", "Email"]} active={filterType} onChange={setFilterType} />

      <div style={S.card}>
        <div style={S.cardHeader}><span>All Conversations</span><span style={{ fontSize: 12, color: COLORS.textMuted }}>{filtered.length} conversations</span></div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Lead</th><th style={S.th}>Type</th><th style={S.th}>Date</th><th style={S.th}>Agent</th><th style={S.th}>Duration</th><th style={S.th}>Outcome</th><th style={S.th}>Sentiment</th><th style={S.th}>Action</th></tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{c.leadName}</span></td>
                <td style={S.td}>{c.type === "voice" ? "📞" : c.type === "sms" ? "💬" : "✉️"} {c.type}</td>
                <td style={S.td}>{c.date}</td>
                <td style={S.td}>{c.agent}</td>
                <td style={S.td}>{c.duration || "—"}</td>
                <td style={S.td}><span style={S.badge(outcomeColors[c.outcome])}>{outcomeLabels[c.outcome]}</span></td>
                <td style={S.td}><span style={{ fontSize: 12, color: sentimentColors[c.sentiment] }}>{c.sentiment}</span></td>
                <td style={S.td}><button style={{ ...S.btn("ghost"), padding: "5px 12px", fontSize: 11 }} onClick={() => setSelected(c)}>▶ Replay</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={S.modal} onClick={() => setSelected(null)}>
          <div style={{ ...S.modalContent, maxWidth: 660 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div><h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Conversation with {selected.leadName}</h3><div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{selected.date} · {selected.type} · Agent: {selected.agent}</div></div>
              <button style={{ ...S.btn("ghost"), padding: "6px 10px" }} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ background: COLORS.surfaceAlt, borderRadius: 10, padding: 16, maxHeight: 400, overflowY: "auto" }}>
              {selected.transcript.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: msg.role === "agent" ? "row" : "row-reverse", marginBottom: 12 }}>
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.6, background: msg.role === "agent" ? `${COLORS.orange}20` : `${COLORS.blue}20` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: msg.role === "agent" ? COLORS.orange : COLORS.blue, marginBottom: 4, textTransform: "uppercase" }}>
                      {msg.role === "agent" ? `🤖 ${selected.agent} (AI)` : `👤 ${selected.leadName}`}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: 12, background: COLORS.orangeGlow, borderRadius: 8, border: `1px solid ${COLORS.orange}33` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.orangeLight, marginBottom: 4 }}>🧠 AI Analysis</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                {selected.outcome === "appointment_set" ? "Successful conversion. Agent used value-first positioning and offered exactly 2 appointment options per protocol."
                  : selected.outcome === "confirmed" ? "Confirmation handled cleanly. AI disclosed identity, confirmed details, captured prep notes."
                  : "Recommend adjusting approach — try switching channel or timing for next attempt."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CONNECT YOUR TECH
// ============================================================
function ConnectTechPage() {
  const [crms, setCrms] = useState(CRM_INTEGRATIONS);
  const [calendars, setCalendars] = useState(CALENDAR_INTEGRATIONS);
  const [activeTab, setActiveTab] = useState("CRM");

  return (
    <div>
      <div style={{ marginBottom: 24 }}><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Connect Your Tech</h2><p style={{ color: COLORS.textMuted, fontSize: 13, margin: "4px 0 0" }}>Integrate CRM, calendars, and lead sources</p></div>
      <TabBar tabs={["CRM", "Calendars", "Lead Sources", "Reaction Stack"]} active={activeTab} onChange={setActiveTab} />

      {activeTab === "CRM" && (
        <div style={S.card}>
          <div style={S.cardHeader}><span>CRM Integrations</span><span style={{ fontSize: 12, color: COLORS.textMuted }}>{crms.filter(c => c.connected).length} connected</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {crms.map((crm, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 12, border: `1px solid ${crm.connected ? COLORS.green : COLORS.border}`, background: crm.connected ? `${COLORS.green}10` : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{crm.icon}</span>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{crm.name}</div><div style={{ fontSize: 11, color: crm.connected ? COLORS.green : COLORS.textMuted }}>{crm.connected ? "✓ Connected" : "Not connected"}</div></div>
                </div>
                <button style={S.btn(crm.connected ? "success" : "secondary")} onClick={() => { const u = [...crms]; u[i].connected = !u[i].connected; setCrms(u); }}>{crm.connected ? "Disconnect" : "Connect"}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Calendars" && (
        <div style={S.card}>
          <div style={S.cardHeader}><span>Calendar Integrations</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
            {calendars.map((cal, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 12, border: `1px solid ${cal.connected ? COLORS.green : COLORS.border}`, background: cal.connected ? `${COLORS.green}10` : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{cal.icon}</span>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{cal.name}</div><div style={{ fontSize: 11, color: cal.connected ? COLORS.green : COLORS.textMuted }}>{cal.connected ? "✓ Connected" : "Not connected"}</div></div>
                </div>
                <button style={S.btn(cal.connected ? "success" : "secondary")} onClick={() => { const u = [...calendars]; u[i].connected = !u[i].connected; setCalendars(u); }}>{cal.connected ? "Disconnect" : "Connect"}</button>
              </div>
            ))}
          </div>
          <div style={{ padding: 16, background: COLORS.surfaceAlt, borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Multi-Calendar Settings</div>
            <Toggle value={true} label="Round-robin across reps" /><div style={{ marginTop: 8 }}><Toggle value={true} label="Buffer time (15 min)" /></div>
            <div style={{ marginTop: 8 }}><Toggle value={true} label="Auto-sync to all calendars" /></div>
          </div>
        </div>
      )}

      {activeTab === "Lead Sources" && (
        <div style={S.card}>
          <div style={S.cardHeader}>Lead Ingestion Methods</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { icon: "☁️", title: "CRM Sync", status: "Active" }, { icon: "📄", title: "File Upload", status: "Active" },
              { icon: "📸", title: "Image/Screenshot", status: "Active" }, { icon: "🌐", title: "Web Scraping", status: "alīv only" },
              { icon: "📱", title: "Inbound Forms", status: "Active" }, { icon: "📞", title: "Inbound Calls", status: "Active" },
              { icon: "💬", title: "SMS/Chat", status: "Active" }, { icon: "📧", title: "Email Inbox", status: "Active" },
              { icon: "📲", title: "Social Media", status: "Coming Soon" }, { icon: "🔌", title: "API Webhook", status: "Active" },
            ].map((src, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{src.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{src.title}</div>
                <span style={S.badge(src.status === "Active" ? COLORS.green : src.status === "Coming Soon" ? COLORS.yellow : COLORS.blue)}>{src.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Reaction Stack" && (
        <div style={S.card}>
          <div style={S.cardHeader}>The Reaction Stack — Enhanced Features</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {[
              { name: "Bond", desc: "AI-Native CRM", features: ["Deep lead history", "Auto pipeline management", "AI upsell suggestions"], color: COLORS.blue },
              { name: "Solvent", desc: "Autonomous AI Permitting", features: ["Auto permit requirements", "Jurisdiction compliance", "Status tracking"], color: COLORS.green },
              { name: "Reactor", desc: "AI Operations OS", features: ["Process automation", "Resource allocation", "Predictive analytics"], color: COLORS.purple },
            ].map((p, i) => (
              <div key={i} style={{ padding: 24, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: `${p.color}08` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: p.color }}>{p.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>{p.desc}</div>
                {p.features.map((f, j) => <div key={j} style={{ fontSize: 12, color: COLORS.textMuted, padding: "3px 0" }}><span style={{ color: p.color }}>✦</span> {f}</div>)}
                <button style={{ ...S.btn("secondary"), marginTop: 12 }}>Connect {p.name}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BILLING — with Features 1 & 5
// ============================================================
function BillingPage() {
  const noShowCredits = 600;
  return (
    <div>
      <div style={{ marginBottom: 24 }}><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Billing & Subscription</h2></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={S.card}>
          <div style={S.cardHeader}>Current Plan</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.orangeLight }}>Growth Tier</div><div style={{ fontSize: 12, color: COLORS.textMuted }}>riivīv + alīv Bundle</div></div>
            <span style={S.badge(COLORS.green)}>Active</span>
          </div>
          {[
            ["Setup Fee (paid)", "$3,500.00"], ["Monthly Maintenance", "$750.00"],
            ["riivīv per appointment", "$400.00"], ["alīv per appointment", "$500.00"],
            ["Bundle discount", "Single maintenance fee"],
            ["Show-Up Guarantee", "$200 credit per no-show"],
          ].map(([l, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}22` }}>
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: l.includes("Guarantee") ? COLORS.teal : COLORS.text }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}>This Month's Invoice</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 16 }}>Mar 1 – Mar 31, 2026</div>
          {[
            ["Maintenance fee", "$750.00", null],
            ["riivīv appointments (34 × $400)", "$13,600.00", null],
            ["alīv appointments (12 × $500)", "$6,000.00", null],
            ["No-show credits (3 × $200)", `-$${noShowCredits}.00`, COLORS.teal],
          ].map(([l, v, c], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}22` }}>
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: c || COLORS.text }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `2px solid ${COLORS.border}`, marginTop: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total Due</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.orangeLight }}>${(20350 - noShowCredits).toLocaleString()}.00</span>
          </div>
          <button style={{ ...S.btn("primary"), width: "100%", marginTop: 16 }}>💳 Pay with Stripe</button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}>Pricing Tiers</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[0, 1, 2].map((tier) => (
            <div key={tier} style={{ padding: 24, borderRadius: 12, textAlign: "center", border: `2px solid ${tier === 1 ? COLORS.orange : COLORS.border}`, background: tier === 1 ? COLORS.orangeGlow : "transparent" }}>
              {tier === 1 && <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.orange, marginBottom: 8, textTransform: "uppercase" }}>Most Popular</div>}
              <div style={{ fontSize: 18, fontWeight: 700 }}>{TIERS.riiviv.tierNames[tier]}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.orangeLight, margin: "12px 0" }}>${TIERS.riiviv.setup[tier].toLocaleString()}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>Setup Fee</div>
              <div style={{ margin: "16px 0", height: 1, background: COLORS.border }} />
              <div style={{ fontSize: 13, marginBottom: 4 }}>${TIERS.riiviv.maintenance[tier]}/mo maintenance</div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>$400/appt (riivīv) · $500/appt (alīv)</div>
              <div style={{ fontSize: 12, color: COLORS.green, marginTop: 8 }}>Bundle: 1 maintenance fee</div>
              <div style={{ fontSize: 12, color: COLORS.teal, marginTop: 4 }}>🛡️ $200 no-show credit</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
function SettingsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h2></div>
      <div style={S.card}>
        <div style={S.cardHeader}>Company Profile</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Company Name</label><input style={S.input} defaultValue="SunPower Solar Solutions" /></div>
          <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Industry</label><select style={{ ...S.select, width: "100%" }}>{INDUSTRIES.map(i => <option key={i}>{i}</option>)}</select></div>
          <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Phone</label><input style={S.input} defaultValue="(555) 100-2000" /></div>
          <div><label style={{ fontSize: 12, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>Email</label><input style={S.input} defaultValue="info@sunpowersolar.com" /></div>
        </div>
        <button style={{ ...S.btn("primary"), marginTop: 16 }}>Save Changes</button>
      </div>
      <div style={S.card}>
        <div style={S.cardHeader}>Team Members</div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Name</th><th style={S.th}>Email</th><th style={S.th}>Role</th><th style={S.th}>Status</th></tr></thead>
          <tbody>
            {[{ name: "John Owner", email: "john@sunpowersolar.com", role: "Admin" }, { name: "Mike Torres", email: "mike@sunpowersolar.com", role: "Sales Rep" }, { name: "Sarah Kim", email: "sarah@sunpowersolar.com", role: "Sales Rep" }].map((m, i) => (
              <tr key={i}><td style={S.td}>{m.name}</td><td style={S.td}>{m.email}</td><td style={S.td}><span style={S.tag(m.role === "Admin" ? COLORS.orange : COLORS.blue)}>{m.role}</span></td><td style={S.td}><span style={S.badge(COLORS.green)}>Active</span></td></tr>
            ))}
          </tbody>
        </table>
        <button style={{ ...S.btn("secondary"), marginTop: 12 }}>+ Invite Team Member</button>
      </div>
      <div style={S.card}>
        <div style={S.cardHeader}>AI Learning Preferences</div>
        <div style={{ display: "grid", gap: 10 }}>
          <Toggle value={true} label="Continuous learning from call outcomes" />
          <Toggle value={true} label="Auto-improve talk tracks" />
          <Toggle value={true} label="Industry-specific sales psychology" />
          <Toggle value={true} label="Auto-suggest upsell opportunities" />
          {/* FEATURE 3: Score decay config */}
          <Toggle value={true} label="Automatic lead score decay over time" />
          <Toggle value={true} label="Market condition score boosting (utility rates, incentives)" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function CatalystApp() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("Dashboard");

  useEffect(() => {
    if (isAuthenticated() && !user) {
      auth.me().then(setUser).catch(() => { clearToken(); setLoggedIn(false); });
    }
  }, [loggedIn]);

  const handleLogout = () => { clearToken(); setLoggedIn(false); setUser(null); };

  if (!loggedIn) return <LoginPage onLogin={(u) => { setUser(u); setLoggedIn(true); }} />;

  const navItems = [
    { section: "Overview" },
    { name: "Dashboard", icon: "📊" },
    { section: "Products" },
    { name: "Campaigns", icon: "🚀", sub: "riivīv & alīv" },
    { name: "Leads", icon: "👥" },
    { name: "Appointments", icon: "📅" },
    { name: "Conversation Replay", icon: "💬" },
    { name: "Proposals & Sales", icon: "📝", badge: "PRO" },
    { section: "Configuration" },
    { name: "Voice AI", icon: "🎙️" },
    { name: "Connect Your Tech", icon: "🔌" },
    { section: "Account" },
    { name: "Billing", icon: "💳" },
    { name: "Settings", icon: "⚙️" },
  ];

  const renderPage = () => {
    switch (page) {
      case "Dashboard": return <DashboardPage setPage={setPage} />;
      case "Leads": return <LeadsPage />;
      case "Campaigns": return <CampaignsPage />;
      case "Appointments": return <AppointmentsPage />;
      case "Conversation Replay": return <ConversationReplayPage />;
      case "Proposals & Sales": return <ProposalsPage />;
      case "Voice AI": return <VoiceAIPage />;
      case "Connect Your Tech": return <ConnectTechPage />;
      case "Billing": return <BillingPage />;
      case "Settings": return <SettingsPage />;
      default: return <DashboardPage setPage={setPage} />;
    }
  };

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={S.sidebar}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <Logo /><div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 6, letterSpacing: 0.5 }}>THE REACTION STACK</div>
        </div>
        <div style={S.sidebarNav}>
          {navItems.map((item, i) => {
            if (item.section) return <div key={i} style={S.navSection}>{item.section}</div>;
            return (
              <div key={i} style={S.navItem(page === item.name)} onClick={() => setPage(item.name)}>
                <span>{item.icon}</span><span style={{ flex: 1 }}>{item.name}</span>
                {item.badge && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: COLORS.purple, color: "#fff", fontWeight: 700 }}>{item.badge}</span>}
                {item.sub && <span style={{ fontSize: 10, color: COLORS.textDim }}>{item.sub}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orangeDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{(user?.firstName || "U")[0]}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{user ? `${user.firstName} ${user.lastName}` : "User"}</div><div style={{ fontSize: 10, color: COLORS.textMuted }}>{user?.email || "Growth Plan"}</div></div>
          <button style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }} onClick={handleLogout}>⏻</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={S.topbar}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{page}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ComplianceBadge />
            <div style={{ position: "relative" }}><span style={{ cursor: "pointer", fontSize: 18 }}>🔔</span><span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: 7, background: COLORS.red, fontSize: 9, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>5</span></div>
            <input style={{ ...S.input, maxWidth: 200, padding: "8px 14px" }} placeholder="Search..." />
          </div>
        </div>
        <div style={S.content}>{renderPage()}</div>
      </div>
    </div>
  );
}
