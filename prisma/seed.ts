// prisma/seed.ts
//
// Run with: npx prisma db seed
//
// Creates:
//   - 1 demo workspace ("Acme Demo Co")
//   - 3 users, one per role, with documented demo credentials below
//   - 6 themes
//   - 120+ feedback rows spread across channels/sentiments/themes
//
// DEMO CREDENTIALS (local/dev only — never reuse a real password here,
// and never seed this in a production database):
//   admin@acmedemo.test    / DemoPass123!   (ADMIN)
//   analyst@acmedemo.test  / DemoPass123!   (ANALYST)
//   viewer@acmedemo.test   / DemoPass123!   (VIEWER)

import { PrismaClient, Channel, Sentiment, FeedbackStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CHANNELS: Channel[] = [
  "SUPPORT_TICKET",
  "APP_REVIEW",
  "NPS_SURVEY",
  "SALES_CALL_NOTE",
  "COMMUNITY_POST",
];

const THEME_DEFS = [
  { name: "Onboarding friction", color: "#4F46E5", description: "New users struggle to get set up" },
  { name: "Pricing concerns", color: "#DC2626", description: "Feedback about cost, plans, billing" },
  { name: "Feature requests", color: "#059669", description: "Specific asks for new functionality" },
  { name: "Performance & reliability", color: "#D97706", description: "Speed, uptime, bugs, crashes" },
  { name: "Customer support experience", color: "#7C3AED", description: "Interactions with support/success teams" },
  { name: "Integrations", color: "#0891B2", description: "Requests or issues around third-party integrations" },
];

// Sentence fragments combined to generate varied, realistic-sounding
// feedback without needing an external content source.
const POS_SNIPPETS = [
  "The new dashboard redesign is so much faster to navigate than before.",
  "Support resolved my issue within an hour, really impressed with the responsiveness.",
  "Onboarding took less than 15 minutes and the checklist was genuinely helpful.",
  "We finally got the Slack integration working and it's saved our team hours every week.",
  "Love that we can now export reports directly to PDF — huge time saver.",
  "The mobile app finally feels as fast as the desktop version.",
  "Whoever designed the new filtering UI deserves a raise, it's intuitive.",
  "Renewed for another year without hesitation, this tool just works.",
];

const NEG_SNIPPETS = [
  "The app crashed twice while I was mid-import and I lost my progress both times.",
  "Pricing jumped 40% at renewal with zero warning, considering switching providers.",
  "Support took four days to respond to a billing question, unacceptable for our plan tier.",
  "The search feature returns irrelevant results half the time, hard to trust it.",
  "We still can't find a way to bulk-edit tags, this should be basic functionality.",
  "Onboarding assumes way too much prior knowledge, our new hires get stuck immediately.",
  "The Salesforce integration breaks silently and we only notice when data goes missing.",
  "Dashboard load times have gotten noticeably worse over the last month.",
];

const NEU_SNIPPETS = [
  "Would be nice to have dark mode, not a dealbreaker but would use it daily.",
  "Curious whether there's a roadmap item for SSO with Okta.",
  "The reporting export works fine, though the CSV formatting needs manual cleanup.",
  "Asked about API rate limits for our use case, still waiting on documentation.",
  "Feature is fine as-is, just wanted to flag that the button label is a bit confusing.",
  "Switched from a competitor, still getting used to the different terminology here.",
];

const CUSTOMER_LABELS = [
  "SMB - Retail", "Enterprise - Fintech", "Mid-market - SaaS", "SMB - Healthcare",
  "Enterprise - Logistics", "Startup - DevTools", "Mid-market - Media", "SMB - Education",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  const past = now - Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(past);
}

async function main() {
  console.log("Seeding Project LOOP demo data...");

  const workspace = await prisma.workspace.create({
    data: { name: "Acme Demo Co" },
  });

  const passwordHash = await bcrypt.hash("DemoPass123!", 12);

  const [admin, analyst, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ava Admin",
        email: "admin@acmedemo.test",
        passwordHash,
        role: "ADMIN",
        workspaceId: workspace.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Alex Analyst",
        email: "analyst@acmedemo.test",
        passwordHash,
        role: "ANALYST",
        workspaceId: workspace.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Val Viewer",
        email: "viewer@acmedemo.test",
        passwordHash,
        role: "VIEWER",
        workspaceId: workspace.id,
      },
    }),
  ]);

  const themes = await Promise.all(
    THEME_DEFS.map((t) => prisma.theme.create({ data: { ...t, workspaceId: workspace.id } }))
  );

  const FEEDBACK_COUNT = 130;

  for (let i = 0; i < FEEDBACK_COUNT; i++) {
    const sentimentRoll = Math.random();
    let sentiment: Sentiment;
    let snippet: string;
    let sentimentScore: number;

    if (sentimentRoll < 0.4) {
      sentiment = "POS";
      snippet = pick(POS_SNIPPETS);
      sentimentScore = 0.4 + Math.random() * 0.6;
    } else if (sentimentRoll < 0.7) {
      sentiment = "NEG";
      snippet = pick(NEG_SNIPPETS);
      sentimentScore = -1 + Math.random() * 0.6;
    } else {
      sentiment = "NEU";
      snippet = pick(NEU_SNIPPETS);
      sentimentScore = -0.15 + Math.random() * 0.3;
    }

    const statusRoll = Math.random();
    const status: FeedbackStatus =
      statusRoll < 0.5 ? "NEW" : statusRoll < 0.8 ? "REVIEWED" : "ACTIONED";

    const feedback = await prisma.feedback.create({
      data: {
        content: snippet,
        channel: pick(CHANNELS),
        sourceRef: `SRC-${1000 + i}`,
        customerLabel: pick(CUSTOMER_LABELS),
        sentiment,
        sentimentScore: Number(sentimentScore.toFixed(2)),
        status,
        createdAt: randomDateWithinDays(120),
        workspaceId: workspace.id,
      },
    });

    // Tag each feedback item with 0-2 themes at a plausible confidence.
    const themeCount = Math.random() < 0.15 ? 0 : Math.random() < 0.7 ? 1 : 2;
    const shuffled = [...themes].sort(() => Math.random() - 0.5).slice(0, themeCount);
    for (const theme of shuffled) {
      await prisma.feedbackTheme.create({
        data: {
          feedbackId: feedback.id,
          themeId: theme.id,
          confidence: Number((0.55 + Math.random() * 0.45).toFixed(2)),
        },
      });
    }
  }

  console.log(`Seeded workspace "${workspace.name}" (${workspace.id})`);
  console.log(`Users: ${admin.email}, ${analyst.email}, ${viewer.email} (password: DemoPass123!)`);
  console.log(`Themes: ${themes.length}`);
  console.log(`Feedback rows: ${FEEDBACK_COUNT}`);
  console.log(
    "Note: embeddings are NOT seeded here (no live embedding API call in seed data). " +
      "Run your embedding backfill job against this data before testing /api/insights."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
