export type NotificationKind = "health_digest" | "season_rollover" | "free_agent_interest" | "service_test";
export type NotificationStatus = "queued" | "sending" | "accepted" | "delivered" | "failed" | "bounced" | "complained" | "suppressed";

export interface EmailContent {
  subject: string;
  title: string;
  preheader: string;
  paragraphs: string[];
  sections?: Array<{ title: string; items: string[]; empty: string }>;
  action: { label: string; path: string };
}

export interface NotificationSummary {
  id: string;
  kind: NotificationKind;
  to: string;
  subject: string;
  status: NotificationStatus;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  lastError: string | null;
}

export interface NotificationSnapshot {
  enabled: boolean;
  configurationIssues: string[];
  from: string;
  replyTo: string;
  counts: Record<NotificationStatus, number>;
  recent: NotificationSummary[];
}
