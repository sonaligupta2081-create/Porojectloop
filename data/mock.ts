// Shared demo dataset. Used two ways:
//  1. prisma/seed.ts loads this into a real Postgres database.
//  2. Client views fall back to it (with a "demo data" badge) if the
//     corresponding API route has no database connected yet — so the app
//     is explorable immediately, per Section 07's "seed data is required" note.
import type { FeedbackItem, ThemeSummary, VoCReport, Member } from "@/types";

export const THEMES: ThemeSummary[] = [
  { name: "Onboarding", count: 214, change: 18, spike: true, spark: [12, 14, 13, 18, 22, 27, 31] },
  { name: "Billing & invoices", count: 156, change: -4, spike: false, spark: [22, 20, 19, 18, 17, 16, 15] },
  { name: "Mobile experience", count: 132, change: 9, spike: false, spark: [14, 15, 15, 16, 17, 18, 19] },
  { name: "SSO / security", count: 98, change: 41, spike: true, spark: [4, 5, 6, 9, 14, 18, 24] },
  { name: "Performance", count: 87, change: 6, spike: false, spark: [11, 11, 12, 12, 13, 13, 14] },
  { name: "Exports & integrations", count: 61, change: -11, spike: false, spark: [10, 9, 9, 8, 7, 7, 6] },
];

export const FEEDBACK: FeedbackItem[] = [
  { id: "FB-482", channel: "support_ticket", customer: "Brightpath Logistics", sentiment: "negative", score: -0.7, themes: ["Onboarding"], status: "NEW", date: "Jul 27", content: "Onboarding took forever — couldn't figure out how to invite my team without opening a ticket." },
  { id: "FB-419", channel: "app_store", customer: "individual user", sentiment: "positive", score: 0.8, themes: ["Mobile experience"], status: "REVIEWED", date: "Jul 27", content: "The new dashboard is gorgeous and finally fast. Huge improvement over the last release." },
  { id: "FB-401", channel: "nps", customer: "Vela Systems", sentiment: "neutral", score: 0.1, themes: ["Mobile experience"], status: "NEW", date: "Jul 26", content: "It does the job, but the mobile experience needs work — filters are hard to reach one-handed." },
  { id: "FB-388", channel: "sales_call", customer: "Marrow & Finch", sentiment: "negative", score: -0.5, themes: ["SSO / security"], status: "ACTIONED", date: "Jul 26", content: "Prospect wants SSO before they'll sign — third time this month we've lost a deal to this." },
  { id: "FB-372", channel: "community", customer: "individual user", sentiment: "positive", score: 0.6, themes: ["Exports & integrations"], status: "REVIEWED", date: "Jul 25", content: "Love the new export feature, saved me an hour today setting up the weekly digest." },
  { id: "FB-360", channel: "support_ticket", customer: "Northbound Retail", sentiment: "negative", score: -0.6, themes: ["Billing & invoices"], status: "NEW", date: "Jul 25", content: "Billing page keeps timing out when I try to download an invoice from last quarter." },
  { id: "FB-347", channel: "support_ticket", customer: "Acme Cargo", sentiment: "negative", score: -0.8, themes: ["Onboarding"], status: "NEW", date: "Jul 24", content: "New hires get lost in the invite flow — we've had two people accidentally create separate workspaces." },
  { id: "FB-333", channel: "nps", customer: "Halden Group", sentiment: "neutral", score: 0.0, themes: ["Performance"], status: "REVIEWED", date: "Jul 24", content: "Fine day to day, but the inbox is noticeably slower once we pass a few thousand rows." },
  { id: "FB-319", channel: "app_store", customer: "individual user", sentiment: "negative", score: -0.4, themes: ["Mobile experience"], status: "NEW", date: "Jul 23", content: "Crashes when I rotate the phone mid-scroll. Happens maybe once a session." },
  { id: "FB-301", channel: "sales_call", customer: "Ferro Analytics", sentiment: "negative", score: -0.5, themes: ["SSO / security"], status: "NEW", date: "Jul 22", content: "Security review flagged the lack of SAML support as a blocker for their enterprise tier." },
  { id: "FB-288", channel: "community", customer: "individual user", sentiment: "neutral", score: 0.1, themes: ["Billing & invoices"], status: "REVIEWED", date: "Jul 22", content: "Wish invoices showed usage broken down by workspace, not just the total." },
  { id: "FB-270", channel: "support_ticket", customer: "Halden Group", sentiment: "positive", score: 0.5, themes: ["Onboarding"], status: "ACTIONED", date: "Jul 21", content: "Support walked us through the invite flow live and it clicked immediately. Maybe worth a tooltip." },
  { id: "FB-255", channel: "nps", customer: "Brightpath Logistics", sentiment: "negative", score: -0.3, themes: ["Performance"], status: "NEW", date: "Jul 20", content: "Dashboard charts take a beat too long to load after switching date ranges." },
  { id: "FB-241", channel: "app_store", customer: "individual user", sentiment: "positive", score: 0.7, themes: ["Exports & integrations"], status: "REVIEWED", date: "Jul 19", content: "The CSV export finally includes theme tags. Small thing, huge time saver for our reporting." },
];

export const REPORTS: VoCReport[] = [
  {
    id: "r2",
    title: "Voice of Customer — Week of Jul 21–27",
    period: "Jul 21 – Jul 27, 2026",
    generated: "Jul 27, 2026",
    stats: { total: 214, negativePct: 34, deltaPct: 6 },
    topThemes: [
      { name: "Onboarding", note: "up 18% — invite flow is the single most-cited friction point this week." },
      { name: "SSO / security", note: "up 41% — now tied to two lost enterprise deals in sales notes." },
    ],
    quotes: [
      { text: "New hires get lost in the invite flow — we've had two people accidentally create separate workspaces.", source: "Support ticket · Acme Cargo" },
      { text: "Prospect wants SSO before they'll sign — third time this month we've lost a deal to this.", source: "Sales call note · Marrow & Finch" },
    ],
    actions: [
      "Add an inline tooltip to the invite flow — 3 tickets this week trace back to this exact step.",
      "Scope SAML/SSO for enterprise tier — cited in 2 lost deals over 30 days.",
      "Investigate dashboard load time on date-range switch — 2 performance reports this week.",
    ],
  },
  {
    id: "r1",
    title: "Voice of Customer — Week of Jul 14–20",
    period: "Jul 14 – Jul 20, 2026",
    generated: "Jul 20, 2026",
    stats: { total: 189, negativePct: 29, deltaPct: -2 },
    topThemes: [
      { name: "Mobile experience", note: "steady — mostly one-handed usability notes on the inbox filters." },
      { name: "Exports & integrations", note: "down 11% — CSV theme-tag export shipped well, praise up in community posts." },
    ],
    quotes: [
      { text: "The CSV export finally includes theme tags. Small thing, huge time saver for our reporting.", source: "App store review" },
      { text: "It does the job, but the mobile experience needs work — filters are hard to reach one-handed.", source: "NPS survey · Vela Systems" },
    ],
    actions: [
      "Move inbox filter bar to a thumb-reachable position on mobile breakpoints.",
      "Publicize the new export in the changelog — community sentiment is already positive.",
    ],
  },
];

export const MEMBERS: Member[] = [
  { name: "Jordan Diaz", email: "jordan@northwindlabs.com", role: "ADMIN", initials: "JD" },
  { name: "Priya Nair", email: "priya@northwindlabs.com", role: "ANALYST", initials: "PN" },
  { name: "Sam Okafor", email: "sam@northwindlabs.com", role: "ANALYST", initials: "SO" },
  { name: "Ravi Chandran", email: "ravi@northwindlabs.com", role: "VIEWER", initials: "RC" },
  { name: "Elena Voss", email: "elena@northwindlabs.com", role: "VIEWER", initials: "EV" },
];

export const VOLUME_SERIES = [
  { day: "Jul 21", count: 26 }, { day: "Jul 22", count: 31 }, { day: "Jul 23", count: 24 },
  { day: "Jul 24", count: 35 }, { day: "Jul 25", count: 41 }, { day: "Jul 26", count: 33 },
  { day: "Jul 27", count: 44 },
];

export const SENTIMENT_SPLIT = [
  { name: "Positive", value: 43, key: "positive" as const },
  { name: "Neutral", value: 23, key: "neutral" as const },
  { name: "Negative", value: 34, key: "negative" as const },
];
