// types.ts
//
// Shared frontend types. This file did not exist in the original
// frontend-only build even though several components imported from
// "@/types" (data/mock.ts, InboxView, SettingsView, AskLoopView) — that
// build could not actually compile. This file fixes that and also
// mirrors the backend's Prisma enums (see prisma/schema.prisma) so the
// UI and API agree on shape.

export type Role = "ADMIN" | "ANALYST" | "VIEWER";

// Backend/API-facing enums (match prisma/schema.prisma exactly)
export type ApiChannel =
  | "SUPPORT_TICKET"
  | "APP_REVIEW"
  | "NPS_SURVEY"
  | "SALES_CALL_NOTE"
  | "COMMUNITY_POST";
export type ApiSentiment = "POS" | "NEU" | "NEG";
export type FeedbackStatus = "NEW" | "REVIEWED" | "ACTIONED";

// UI-facing (mock/demo data) variants — kept distinct from the API enums
// because the original mock dataset used lowercase/human channel and
// sentiment values. mapApiChannel/mapApiSentiment below convert between
// the two so real API data can render through the same components.
export type UiChannel = "support_ticket" | "app_store" | "nps" | "sales_call" | "community";
export type UiSentiment = "positive" | "neutral" | "negative";
// Alias kept because several existing components (SentimentDot, etc.)
// import "Sentiment" specifically — renaming those call sites isn't
// worth the churn when an alias does the job.
export type Sentiment = UiSentiment;

export interface Theme {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  feedbackCount: number;
}

export interface FeedbackThemeLink {
  confidence: number;
  theme: { id: string; name: string; color: string };
}

export interface ApiFeedbackItem {
  id: string;
  content: string;
  channel: ApiChannel;
  sourceRef?: string | null;
  customerLabel?: string | null;
  sentiment: ApiSentiment;
  sentimentScore: number;
  status: FeedbackStatus;
  createdAt: string;
  feedbackThemes?: FeedbackThemeLink[];
}

// UI/demo shape used by the existing components (InboxView, TrendsView).
export interface FeedbackItem {
  id: string;
  channel: UiChannel;
  customer: string;
  sentiment: UiSentiment;
  score: number;
  themes: string[];
  status: FeedbackStatus;
  date: string;
  content: string;
}

export interface ThemeSummary {
  name: string;
  count: number;
  change: number;
  spike: boolean;
  spark: number[];
}

export interface VoCReport {
  id: string;
  title: string;
  period: string;
  generated: string;
  stats: { total: number; negativePct: number; deltaPct: number };
  topThemes: { name: string; note: string }[];
  quotes: { text: string; source: string }[];
  actions: string[];
}

export interface Member {
  name: string;
  email: string;
  role: Role;
  initials: string;
  id?: string;
}

export interface AskAnswer {
  text: string;
  sources: string[];
}

export interface DashboardMetrics {
  totalItems: number;
  percentNegative: number;
  newThisWeek: number;
  topThemeName: string;
  isSpikeAlert: boolean;
  sentimentBreakdown: { name: string; value: number; color: string }[];
  topThemes: { name: string; count: number; color: string }[];
  volumeOverTime: { date: string; volume: number; negative: number }[];
}

// --- API <-> UI mapping helpers -------------------------------------
// The API speaks Prisma's enums (SUPPORT_TICKET, POS, ...); the existing
// UI components speak the friendlier mock-data enums (support_ticket,
// positive, ...). These map one to the other so real API responses can
// flow straight into the components built for the mock dataset.

const CHANNEL_API_TO_UI: Record<ApiChannel, UiChannel> = {
  SUPPORT_TICKET: "support_ticket",
  APP_REVIEW: "app_store",
  NPS_SURVEY: "nps",
  SALES_CALL_NOTE: "sales_call",
  COMMUNITY_POST: "community",
};

const SENTIMENT_API_TO_UI: Record<ApiSentiment, UiSentiment> = {
  POS: "positive",
  NEU: "neutral",
  NEG: "negative",
};

export function mapApiFeedbackToUi(item: ApiFeedbackItem): FeedbackItem {
  return {
    id: item.id,
    channel: CHANNEL_API_TO_UI[item.channel],
    customer: item.customerLabel || "Unlabeled customer",
    sentiment: SENTIMENT_API_TO_UI[item.sentiment],
    score: item.sentimentScore,
    themes: (item.feedbackThemes ?? []).map((ft) => ft.theme.name),
    status: item.status,
    date: new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    content: item.content,
  };
}
