import { ASSET_BASE } from "../env";
import imageFiles from "../data/plant-images.json";

const files = imageFiles as Record<string, string>;
export const plantImage = (name: string) =>
  files[name]
    ? `${ASSET_BASE}legacy/images/plants/${encodeURIComponent(files[name])}`
    : "";
export const plantLink = (name: string) => ({
  name: "plant-detail",
  params: { name },
});
export const periodLabel = (value?: string) =>
  !value || value.trim() === "-" ? "暂无记录" : value;
export const plantColor = (family: string) => {
  const palette = [
    "#75c99b",
    "#6db39b",
    "#51b6ae",
    "#db91b7",
    "#a4d0c4",
    "#8fb584",
  ];
  const hash = [...family].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[hash % palette.length]!;
};
