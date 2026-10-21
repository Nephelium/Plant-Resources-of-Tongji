import photoData from "../data/plant-photo-regions.json";
import { plantImage } from "./plants";

export type PhotoRegion = [number, number, number, number];
export type PhotoSheet = {
  width: number;
  height: number;
  regions: PhotoRegion[];
};
const sheets: Record<string, PhotoSheet> = Object.fromEntries(
  Object.entries(photoData).map(([name, sheet]) => [
    name,
    {
      ...sheet,
      regions: sheet.regions.map((region): PhotoRegion => {
        const [x, y, width, height] = region;
        if (
          region.length !== 4 ||
          x === undefined ||
          y === undefined ||
          width === undefined ||
          height === undefined ||
          width <= 0 ||
          height <= 0
        )
          throw new Error("Invalid photo region: " + name);
        return [x, y, width, height];
      }),
    },
  ]),
);
export const plantPhotoSheet = (name: string) => sheets[name];
export const plantPhotoCount = (name: string, fallback = "") =>
  plantImage(name) ? sheets[name]?.regions.length || 1 : fallback ? 1 : 0;
