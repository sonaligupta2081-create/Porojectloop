// lib/scoped-db.ts
//
// Thin wrappers around the tenant-owned Prisma models that force a
// workspaceId into every query. Route handlers should reach for these
// instead of calling db.feedback / db.theme / db.report directly, so
// that "forgetting the workspaceId filter" is not something a future
// contributor can accidentally do.
//
// This does NOT replace requireAuth()/requireRole() — you still need
// those to get a trustworthy workspaceId in the first place. This just
// makes it structurally harder to misuse that workspaceId once you have
// it.

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export function scopedFeedback(workspaceId: string) {
  return {
    findMany: (args: Omit<Prisma.FeedbackFindManyArgs, "where"> & {
      where?: Omit<Prisma.FeedbackWhereInput, "workspaceId">;
    }) =>
      db.feedback.findMany({
        ...args,
        where: { ...args.where, workspaceId },
      }),
    findUnique: (id: string, args?: Omit<Prisma.FeedbackFindFirstArgs, "where">) =>
      // findFirst, not findUnique — findUnique can't take a compound
      // (id + workspaceId) filter unless you add a @@unique for it, and
      // findFirst with both conditions is what actually prevents a user
      // from reading another workspace's row by guessing its id.
      db.feedback.findFirst({ ...args, where: { id, workspaceId } }),
    count: (where?: Omit<Prisma.FeedbackWhereInput, "workspaceId">) =>
      db.feedback.count({ where: { ...where, workspaceId } }),
    create: (data: Omit<Prisma.FeedbackUncheckedCreateInput, "workspaceId">) =>
      db.feedback.create({ data: { ...data, workspaceId } }),
    updateById: (id: string, data: Prisma.FeedbackUncheckedUpdateInput) =>
      // updateMany so the workspaceId is enforced in the WHERE clause;
      // a plain update({where:{id}}) would update the row even if it
      // belongs to a different workspace.
      db.feedback.updateMany({ where: { id, workspaceId }, data }),
    deleteById: (id: string) => db.feedback.deleteMany({ where: { id, workspaceId } }),
  };
}

export function scopedTheme(workspaceId: string) {
  return {
    findMany: (args?: Omit<Prisma.ThemeFindManyArgs, "where"> & {
      where?: Omit<Prisma.ThemeWhereInput, "workspaceId">;
    }) =>
      db.theme.findMany({ ...args, where: { ...args?.where, workspaceId } }),
    findUnique: (id: string, args?: Omit<Prisma.ThemeFindFirstArgs, "where">) =>
      db.theme.findFirst({ ...args, where: { id, workspaceId } }),
    create: (data: Omit<Prisma.ThemeUncheckedCreateInput, "workspaceId">) =>
      db.theme.create({ data: { ...data, workspaceId } }),
  };
}

export function scopedReport(workspaceId: string) {
  return {
    findMany: (args?: Omit<Prisma.ReportFindManyArgs, "where">) =>
      db.report.findMany({ ...args, where: { workspaceId } }),
    findUnique: (id: string) => db.report.findFirst({ where: { id, workspaceId } }),
    create: (data: Omit<Prisma.ReportUncheckedCreateInput, "workspaceId">) =>
      db.report.create({ data: { ...data, workspaceId } }),
  };
}

/**
 * For FeedbackTheme and Embedding, tenancy is enforced transitively
 * through their parent Feedback/Theme row (there's no workspaceId
 * column on those join/child tables — see schema.prisma). Always reach
 * these through a Feedback or Theme row you've already scoped, e.g.:
 *
 *   const fb = await scopedFeedback(workspaceId).findUnique(feedbackId);
 *   if (!fb) throw new ApiError(404, "Not found");
 *   const themes = await db.feedbackTheme.findMany({ where: { feedbackId: fb.id } });
 */
