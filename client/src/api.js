// API client for Catalyst frontend
const API_BASE = "";

function getToken() {
  return localStorage.getItem("catalyst_token");
}

export function setToken(token) {
  localStorage.setItem("catalyst_token", token);
}

export function clearToken() {
  localStorage.removeItem("catalyst_token");
}

export function isAuthenticated() {
  return !!getToken();
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

// Auth
export const auth = {
  login: (email, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data) => request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/api/auth/me"),
};

// Dashboard
export const dashboard = {
  getStats: () => request("/api/dashboard"),
};

// Leads
export const leadsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.temperature) params.set("temperature", filters.temperature);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    return request(`/api/leads${qs ? `?${qs}` : ""}`);
  },
  get: (id) => request(`/api/leads/${id}`),
  create: (data) => request("/api/leads", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id) => request(`/api/leads/${id}`, { method: "DELETE" }),
  getMessages: (leadId) => request(`/api/leads/${leadId}/messages`),
  sendMessage: (leadId, data) => request(`/api/leads/${leadId}/messages`, { method: "POST", body: JSON.stringify(data) }),
  getPipelineStats: () => request("/api/leads/pipeline/stats"),
};

// Appointments
export const appointmentsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.leadId) params.set("leadId", String(filters.leadId));
    const qs = params.toString();
    return request(`/api/appointments${qs ? `?${qs}` : ""}`);
  },
  create: (data) => request("/api/appointments", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// Campaigns
export const campaignsApi = {
  list: () => request("/api/campaigns"),
  create: (data) => request("/api/campaigns", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// Proposals
export const proposalsApi = {
  list: (leadId) => request(`/api/proposals${leadId ? `?leadId=${leadId}` : ""}`),
  create: (data) => request("/api/proposals", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/proposals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// Messages
export const messagesApi = {
  recent: (limit = 20) => request(`/api/messages/recent?limit=${limit}`),
};

// Activity
export const activityApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.entityId) params.set("entityId", String(filters.entityId));
    if (filters.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return request(`/api/activity${qs ? `?${qs}` : ""}`);
  },
};

// Organizations
export const organizationsApi = {
  list: () => request("/api/organizations"),
  create: (data) => request("/api/organizations", { method: "POST", body: JSON.stringify(data) }),
};

// Messaging (Twilio + SendGrid)
export const messagingApi = {
  sendSMS: (leadId, message, aiGenerated = false) =>
    request(`/api/leads/${leadId}/sms`, { method: "POST", body: JSON.stringify({ message, aiGenerated }) }),
  sendEmail: (leadId, subject, body, aiGenerated = false) =>
    request(`/api/leads/${leadId}/email`, { method: "POST", body: JSON.stringify({ subject, body, aiGenerated }) }),
  initiateCall: (leadId) =>
    request(`/api/leads/${leadId}/call`, { method: "POST", body: JSON.stringify({}) }),
  integrationStatus: () => request("/api/integrations/status"),
};

// AI (Claude)
export const aiApi = {
  scoreLead: (leadId, notes) =>
    request(`/api/leads/${leadId}/score`, { method: "POST", body: JSON.stringify({ notes }) }),
  generateMessage: (leadId, channel, context) =>
    request(`/api/leads/${leadId}/generate-message`, { method: "POST", body: JSON.stringify({ channel, context }) }),
  handleObjection: (objection, leadContext) =>
    request("/api/ai/objection", { method: "POST", body: JSON.stringify({ objection, leadContext }) }),
  scoreAll: () =>
    request("/api/leads/score-all", { method: "POST", body: JSON.stringify({}) }),
  status: () => request("/api/ai/status"),
};

// Health
export const health = {
  check: () => request("/api/health"),
};
