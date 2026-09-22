import type { Source, SourceCategory } from "../db-types";

export type SourceRegistryClient = {
  source: {
    findMany(args: { where?: { category?: SourceCategory; enabled?: boolean } }): Promise<Source[]>;
    update(args: { where: { id: string }; data: { enabled: boolean } }): Promise<Source>;
  };
};

export function createSourceRegistry(client: SourceRegistryClient) {
  return {
    listSources(category?: SourceCategory) {
      return client.source.findMany({ where: category ? { category } : undefined });
    },
    getEnabledSources(category: SourceCategory) {
      return client.source.findMany({ where: { category, enabled: true } });
    },
    setSourceEnabled(id: string, enabled: boolean) {
      return client.source.update({ where: { id }, data: { enabled } });
    },
  };
}

async function registry() {
  const { db } = await import("../db");
  return createSourceRegistry(db);
}

export async function listSources(category?: SourceCategory): Promise<Source[]> {
  return (await registry()).listSources(category);
}

export async function getEnabledSources(category: SourceCategory): Promise<Source[]> {
  return (await registry()).getEnabledSources(category);
}

export async function setSourceEnabled(id: string, enabled: boolean): Promise<Source> {
  return (await registry()).setSourceEnabled(id, enabled);
}
