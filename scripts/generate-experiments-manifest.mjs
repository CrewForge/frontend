import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(thisFile), "..");
const publicRoot = path.join(repoRoot, "public");
const experimentsRoot = path.join(publicRoot, "experiments");
const outputPath = path.join(experimentsRoot, "index.json");

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(full);
    }
  }
  return out;
}

function toPublicPath(absPath) {
  const rel = path.relative(publicRoot, absPath).split(path.sep).join("/");
  return `/${rel}`;
}

function parseResultField(result) {
  if (result && typeof result === "object") return result;
  if (typeof result !== "string") return null;
  try {
    const parsed = JSON.parse(result);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

async function buildManifest() {
  let files = [];
  try {
    files = await walk(experimentsRoot);
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") {
      await fs.mkdir(experimentsRoot, { recursive: true });
      files = [];
    } else {
      throw err;
    }
  }

  const datasetFiles = files.filter((file) => file.includes(`${path.sep}datasets${path.sep}`));
  const entries = [];

  for (const datasetFile of datasetFiles) {
    try {
      const raw = await fs.readFile(datasetFile, "utf8");
      const dataset = JSON.parse(raw);
      const metadata = dataset?.metadata ?? {};
      const config = dataset?.config ?? {};
      const resultObject = parseResultField(dataset?.result);
      const movesArr = Array.isArray(dataset?.moves) ? dataset.moves : [];
      const totalMovesFromJson =
        movesArr.length > 0
          ? movesArr.length
          : typeof dataset?.total_moves === "number"
            ? dataset.total_moves
            : 0;

      entries.push({
        id: metadata.record_id ?? config.experiment_id ?? path.basename(datasetFile, ".json"),
        experimentId: metadata.experiment_id ?? config.experiment_id ?? "unknown",
        systemType: metadata.system_type ?? config.system_type ?? "unknown",
        envType: metadata.env_type ?? config.env_type ?? "unknown",
        metaModel: config.meta_model_name ?? null,
        crewModel: config.crew_model_name ?? null,
        startedAt: metadata.started_at ?? null,
        endedAt: metadata.ended_at ?? null,
        durationSeconds:
          typeof dataset?.duration_seconds === "number" ? dataset.duration_seconds : null,
        totalTokens: typeof dataset?.total_tokens === "number" ? dataset.total_tokens : null,
        totalMoves: totalMovesFromJson,
        result: resultObject ?? dataset?.result ?? null,
        path: toPublicPath(datasetFile),
      });
    } catch (err) {
      console.warn(`Skipping invalid dataset file: ${datasetFile}`);
      console.warn(err instanceof Error ? err.message : String(err));
    }
  }

  entries.sort((a, b) => {
    const ta = Date.parse(a.startedAt ?? "") || 0;
    const tb = Date.parse(b.startedAt ?? "") || 0;
    return tb - ta;
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "/experiments",
    totalDatasets: entries.length,
    entries,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${entries.length} entries to ${outputPath}`);
}

buildManifest().catch((err) => {
  console.error(err);
  process.exit(1);
});
