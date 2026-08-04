import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  const logo = await readFile(
    new URL("../assets/brand/logo.svg", import.meta.url),
    "utf8",
  );
  const logoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logo)}`;

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f7f4ef",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs a data URL. */}
      <img alt="" height={150} src={logoDataUrl} width={150} />
    </div>,
    size,
  );
}
