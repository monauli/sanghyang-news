import { db } from "../db";
import type { GeneratedInsight, InsightStatus, InsightType } from "./insights";

export type InsightRepositoryClient = { marketInsight: { create(args: { data: unknown }): Promise<unknown>; findMany(args: { where?: Record<string, unknown>; orderBy: Record<string, string> }): Promise<unknown[]> } };
export function createInsightRepository(client: InsightRepositoryClient) {
  return {
    create(input: GeneratedInsight) { return client.marketInsight.create({ data: input }); },
    list(filters: { type?: InsightType; status?: InsightStatus } = {}) { return client.marketInsight.findMany({ where: filters, orderBy: { generatedAt: "desc" } }); },
  };
}
export const insightRepository = createInsightRepository(db as unknown as InsightRepositoryClient);
