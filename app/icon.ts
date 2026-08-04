import { readFile } from "node:fs/promises";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/svg+xml";

export default async function Icon() {
  const logo = await readFile(
    new URL("../assets/brand/logo.svg", import.meta.url),
  );

  return new Response(logo, {
    headers: {
      "Content-Type": contentType,
    },
  });
}
