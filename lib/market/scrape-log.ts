import type { PrismaClient } from "@prisma/client";
import type { ScrapeError, ScrapeJob, ScrapeRun, ScrapeRunStatus, ScrapeStage } from "../db-types";

export type { ScrapeError, ScrapeJob, ScrapeRun, ScrapeRunStatus, ScrapeStage } from "../db-types";
export type ScrapeLogClient = Pick<PrismaClient, "$transaction" | "scrapeError" | "scrapeRun" | "source">;

const ERROR_MESSAGE_MAX_LENGTH = 500;

function safeErrorMessage(message: string): string {
  return message.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, ERROR_MESSAGE_MAX_LENGTH);
}

export function createScrapeLog(client: ScrapeLogClient) {
  return {
    startRun(sourceId: string, job: ScrapeJob): Promise<ScrapeRun> {
      return client.scrapeRun.create({ data: { sourceId, job } });
    },

    async finishRun(id: string, result: { status: ScrapeRunStatus; discovered: number; saved: number; duplicates: number; errors: number }): Promise<ScrapeRun> {
      const finishedAt = new Date();
      const run = await client.scrapeRun.update({
        where: { id },
        data: {
          status: result.status,
          finishedAt,
          recordsDiscovered: result.discovered,
          recordsSaved: result.saved,
          duplicates: result.duplicates,
          errors: result.errors,
        },
      });
      await client.source.update({
        where: { id: run.sourceId },
        data: result.status === "success"
          ? { lastRunAt: finishedAt, lastSuccessAt: finishedAt, failureCount: 0 }
          : { lastRunAt: finishedAt, failureCount: { increment: 1 } },
      });
      return run;
    },

    recordScrapeError(input: { runId: string; sourceId: string; url?: string; stage: ScrapeStage; message: string; statusCode?: number }): Promise<ScrapeError> {
      return client.$transaction(async (tx) => {
        const error = await tx.scrapeError.create({
          data: { ...input, message: safeErrorMessage(input.message) },
        });
        await tx.scrapeRun.update({ where: { id: input.runId }, data: { errors: { increment: 1 } } });
        return error;
      });
    },

    listRecentRuns(limit: number): Promise<ScrapeRun[]> {
      return client.scrapeRun.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    },
  };
}

async function scrapeLog() {
  const { db } = await import("../db");
  return createScrapeLog(db);
}

export async function startRun(sourceId: string, job: ScrapeJob): Promise<ScrapeRun> {
  return (await scrapeLog()).startRun(sourceId, job);
}

export async function finishRun(id: string, result: { status: ScrapeRunStatus; discovered: number; saved: number; duplicates: number; errors: number }): Promise<ScrapeRun> {
  return (await scrapeLog()).finishRun(id, result);
}

export async function recordScrapeError(input: { runId: string; sourceId: string; url?: string; stage: ScrapeStage; message: string; statusCode?: number }): Promise<ScrapeError> {
  return (await scrapeLog()).recordScrapeError(input);
}

export async function listRecentRuns(limit: number): Promise<ScrapeRun[]> {
  return (await scrapeLog()).listRecentRuns(limit);
}
