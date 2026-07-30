import type { JSX } from "react";
import { useTranslation } from "react-i18next";

/**
 * App mark in the header. The logo carries the wordmark itself, so no text
 * label is rendered next to it — the app name lives in the image's `alt` so it
 * still reaches screen readers. The artwork is a square with its own white
 * margin baked in, hence the generous height: the glyph inside reads smaller
 * than the box.
 */
export function Brand({ height = 30 }: { height?: number }): JSX.Element {
  const { t } = useTranslation();
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt={t("common.appName")}
      height={height}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
