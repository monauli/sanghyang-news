import { db } from "../db";
import type { GeneratedInsight, InsightStatus, InsightType } from "./insights";
import { createHash } from "node:crypto";

export const insightFingerprint = (input: Pick<GeneratedInsight, "type" | "title" | "summary">) => createHash("sha256").update(JSON.stringify([input.type, input.title.trim(), input.summary.trim()])).digest("hex");
export type InsightRepositoryClient = { marketInsight: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]>; findFirst(args: { where: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<unknown | null> } };
export function createInsightRepository(client: InsightRepositoryClient) {
  return {
    async create(input: GeneratedInsight) {
      const fingerprint = insightFingerprint(input);
      try { return await client.marketInsight.create({ data: { ...input, fingerprint, activeFingerprint: input.status === "active" ? fingerprint : null } }); }
      catch (error) { if ((error as { code?: string }).code !== "P2002" || input.status !== "active") throw error; return client.marketInsight.findFirst({ where: { activeFingerprint: fingerprint }, orderBy: { generatedAt: "desc" } }); }
    },
    list(filters: { type?: InsightType; status?: InsightStatus } = {}) { return client.marketInsight.findMany({ where: filters, orderBy: { generatedAt: "desc" } }); },
  };
}
export const insightRepository = createInsightRepository(db as unknown as InsightRepositoryClient);
