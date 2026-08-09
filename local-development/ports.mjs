import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { projectRoot } from "./paths.mjs";
import { capture } from "./process.mjs";

const portSlotCount = 6_000;
const portBlockStart = 20_000;
const portBlockSize = 6;

export function normalizedPath(value) {
  const resolved = path.resolve(value).replaceAll("\\", "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function shortHash(value, length = 8) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

export function workspaceInstanceId() {
  return shortHash(normalizedPath(projectRoot));
}

function repositoryRegistryKey() {
  const remote = capture("git", ["remote", "get-url", "origin"], {
    allowFailure: true,
  });
  return shortHash(remote || normalizedPath(projectRoot), 12);
}

function reservationDirectory() {
  return path.join(
    os.tmpdir(),
    "codebuff-next-local-environment",
    repositoryRegistryKey(),
    "ports",
  );
}

function reservationFile(slot) {
  return path.join(reservationDirectory(), `${slot}.json`);
}

function portsForSlot(slot) {
  const base = portBlockStart + slot * portBlockSize;
  return {
    app: base,
    postgres: base + 1,
    garageS3: base + 2,
    garageRpc: base + 3,
    garageWeb: base + 4,
    garageAdmin: base + 5,
  };
}

function portIsAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function portsAreAvailable(ports) {
  const results = await Promise.all(
    Object.values(ports).map((port) => portIsAvailable(port)),
  );
  return results.every(Boolean);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function releasePortReservation(
  slot,
  expectedRoot = normalizedPath(projectRoot),
) {
  const file = reservationFile(slot);
  if (!existsSync(file)) {
    return;
  }

  try {
    const record = readJson(file);
    if (record.projectRoot === expectedRoot) {
      unlinkSync(file);
    }
  } catch {
    // A malformed reservation is left untouched for a human to inspect.
  }
}

export async function reservePortBlock(instanceId) {
  const directory = reservationDirectory();
  mkdirSync(directory, { recursive: true });
  const canonicalRoot = normalizedPath(projectRoot);
  const seed = Number.parseInt(instanceId.slice(0, 8), 16) % portSlotCount;

  for (let offset = 0; offset < portSlotCount; offset += 1) {
    const slot = (seed + offset) % portSlotCount;
    const file = reservationFile(slot);
    let handle;

    try {
      handle = openSync(file, "wx");
      writeFileSync(
        handle,
        `${JSON.stringify(
          {
            instanceId,
            projectRoot: canonicalRoot,
            reservedAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      );
      closeSync(handle);
      handle = undefined;

      const ports = portsForSlot(slot);
      if (await portsAreAvailable(ports)) {
        return { ports, slot };
      }

      releasePortReservation(slot, canonicalRoot);
    } catch (error) {
      if (handle !== undefined) {
        closeSync(handle);
      }

      if (error?.code !== "EEXIST") {
        throw error;
      }

      try {
        const record = readJson(file);
        if (record.projectRoot === canonicalRoot) {
          return { ports: portsForSlot(slot), slot };
        }

        if (!existsSync(record.projectRoot)) {
          unlinkSync(file);
          offset -= 1;
        }
      } catch {
        // Skip reservations that are concurrently written or malformed.
      }
    }
  }

  throw new Error("No free local development port block is available.");
}

export function claimPortReservation(instance) {
  const directory = reservationDirectory();
  const file = reservationFile(instance.slot);
  const canonicalRoot = normalizedPath(projectRoot);
  mkdirSync(directory, { recursive: true });

  if (existsSync(file)) {
    const record = readJson(file);
    if (record.projectRoot !== canonicalRoot) {
      throw new Error(
        `Port block ${instance.slot} is reserved by another worktree. ` +
          "Destroy this local environment and bootstrap it again to allocate a new block.",
      );
    }
    return;
  }

  let handle;
  try {
    handle = openSync(file, "wx");
    writeFileSync(
      handle,
      `${JSON.stringify(
        {
          instanceId: instance.instanceId,
          projectRoot: canonicalRoot,
          reservedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
    );
    closeSync(handle);
  } catch (error) {
    if (handle !== undefined) {
      closeSync(handle);
    }
    throw error;
  }
}
