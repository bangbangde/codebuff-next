import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

import { projectRoot } from "./paths.mjs";

function invocation(command, args) {
  if (
    command === "pnpm" &&
    process.env.npm_execpath &&
    existsSync(process.env.npm_execpath)
  ) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, ...args],
    };
  }

  return { command, args };
}

export function capture(command, args, { allowFailure = false } = {}) {
  const target = invocation(command, args);
  const result = spawnSync(target.command, target.args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
    windowsHide: true,
  });

  if (result.error) {
    if (allowFailure) {
      return "";
    }
    throw result.error;
  }

  if (result.status !== 0) {
    if (allowFailure) {
      return "";
    }

    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(
      `${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`,
    );
  }

  return result.stdout.trim();
}

export function run(
  command,
  args,
  { env = process.env, allowFailure = false } = {},
) {
  return new Promise((resolve, reject) => {
    const target = invocation(command, args);
    const child = spawn(target.command, target.args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      windowsHide: true,
    });

    child.once("error", (error) => {
      if (allowFailure) {
        resolve(false);
      } else {
        reject(error);
      }
    });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(true);
        return;
      }

      if (allowFailure) {
        resolve(false);
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${
            signal ? `signal ${signal}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });
}
