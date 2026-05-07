import { promises as fs } from "node:fs";
import path from "node:path";
import { AppConfigSchema, DEFAULT_CONFIG, type AppConfig } from "@/lib/config/schema";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const TMP_PATH = path.join(DATA_DIR, "config.json.tmp");

let writing: Promise<void> | null = null;
let cached: AppConfig | null = null;

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function backupCorrupted(reason: string) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(DATA_DIR, `config.json.bak.${ts}`);
    await fs.rename(CONFIG_PATH, backupPath);
    console.warn(`[config] backed up corrupted config to ${backupPath}: ${reason}`);
  } catch {
    // best-effort; swallow
  }
}

export async function readConfig(): Promise<AppConfig> {
  if (cached) return cached;
  await ensureDir();
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const json = JSON.parse(raw);
    const parsed = AppConfigSchema.safeParse(json);
    if (!parsed.success) {
      await backupCorrupted(parsed.error.message);
      cached = structuredClone(DEFAULT_CONFIG);
      await persist(cached);
      return cached;
    }
    cached = parsed.data;
    return cached;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      cached = structuredClone(DEFAULT_CONFIG);
      await persist(cached);
      return cached;
    }
    if (err instanceof SyntaxError) {
      await backupCorrupted(err.message);
      cached = structuredClone(DEFAULT_CONFIG);
      await persist(cached);
      return cached;
    }
    throw err;
  }
}

async function persist(config: AppConfig) {
  await ensureDir();
  await fs.writeFile(TMP_PATH, JSON.stringify(config, null, 2), "utf8");
  await fs.rename(TMP_PATH, CONFIG_PATH);
}

export async function writeConfig(patch: (current: AppConfig) => AppConfig | Promise<AppConfig>): Promise<AppConfig> {
  const run = async () => {
    const current = await readConfig();
    const next = await patch(structuredClone(current));
    const validated = AppConfigSchema.parse(next);
    await persist(validated);
    cached = validated;
  };

  const previous = writing ?? Promise.resolve();
  writing = previous.then(run, run);
  await writing;
  return cached!;
}

export function clearConfigCache() {
  cached = null;
}
