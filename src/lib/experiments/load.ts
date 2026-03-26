import type { ExperimentDataset, ExperimentManifestEntry, ExperimentsManifest, ExperimentMove } from "./types";

const manifestCache = new Map<string, Promise<ExperimentManifestEntry[]>>();
const datasetCache = new Map<string, Promise<ExperimentDataset>>();

export async function loadManifest(path = "/experiments/index.json"): Promise<ExperimentManifestEntry[]> {
  let promise = manifestCache.get(path);
  if (!promise) {
    promise = fetch(path)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load experiment manifest (${response.status})`);
        }
        const body = (await response.json()) as ExperimentsManifest;
        return Array.isArray(body.entries) ? body.entries : [];
      })
      .catch((err) => {
        manifestCache.delete(path);
        throw err;
      });
    manifestCache.set(path, promise);
  }
  return promise;
}

/** Coerce nested `game_result.moves`, etc. into `{ moves }` for graph + replay. Top-level arrays are left to callers (NDJSON vs move list). */
export function normalizeLoadedDataset(raw: unknown): ExperimentDataset {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (Array.isArray(raw)) {
    return {};
  }
  if (typeof raw !== "object") {
    return {};
  }
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.moves)) {
    return raw as ExperimentDataset;
  }
  const gr = o.game_result as Record<string, unknown> | undefined;
  if (gr && Array.isArray(gr.moves)) {
    return { ...o, moves: gr.moves as ExperimentMove[] } as ExperimentDataset;
  }
  return raw as ExperimentDataset;
}

export async function loadDataset(path: string): Promise<ExperimentDataset> {
  let promise = datasetCache.get(path);
  if (!promise) {
    promise = fetch(path)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load experiment dataset (${response.status})`);
        }
        const raw = await response.json();
        return normalizeLoadedDataset(raw);
      })
      .catch((err) => {
        datasetCache.delete(path);
        throw err;
      });
    datasetCache.set(path, promise);
  }
  return promise;
}

export function clearExperimentCaches() {
  manifestCache.clear();
  datasetCache.clear();
}
