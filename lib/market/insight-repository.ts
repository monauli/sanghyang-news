import { db } from "../db";
import type { GeneratedInsight, InsightStatus, InsightType } from "./insights";
import { createHash } from "node:crypto";

export const insightFingerprint = (input: Pick<GeneratedInsight, "type" | "title" | "summary">) => createHash("sha256").update(JSON.stringify([input.type, input.title.trim(), input.summary.trim()])).digest("hex");
export type InsightRepositoryClient = { marketInsight: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]> } };
export function createInsightRepository(client: InsightRepositoryClient) {
  return {
    create(input: GeneratedInsight) { return client.marketInsight.create({ data: { ...input, fingerprint: insightFingerprint(input) } }); },
    list(filters: { type?: InsightType; status?: InsightStatus } = {}) { return client.marketInsight.findMany({ where: filters, orderBy: { generatedAt: "desc" } }); },
  };
}
export const insightRepository = createInsightRepository(db as unknown as InsightRepositoryClient);
