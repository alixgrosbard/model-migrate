import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { applyAliasSnapshotShutdowns } from "../../src/lib/aliases.js";
let cache;
export function dataDir() {
    return process.env.DATA_DIR || path.join(process.cwd(), "data", "models");
}
export async function loadModelRows() {
    cache ??= readAll();
    return cache;
}
async function readAll() {
    const dir = dataDir();
    const providers = await readdir(dir);
    const models = [];
    for (const provider of providers) {
        const folder = path.join(dir, provider);
        const files = await readdir(folder);
        for (const file of files) {
            if (!file.endsWith(".json"))
                continue;
            models.push(JSON.parse(await readFile(path.join(folder, file), "utf8")));
        }
    }
    return applyAliasSnapshotShutdowns(models);
}
export async function loadMigrations() {
    const dir = path.join(path.dirname(dataDir()), "migrations");
    const files = await readdir(dir);
    const rows = [];
    for (const file of files) {
        if (!file.endsWith(".json"))
            continue;
        rows.push(JSON.parse(await readFile(path.join(dir, file), "utf8")));
    }
    return rows;
}
