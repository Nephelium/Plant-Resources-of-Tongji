import { readdir, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const files = (await readdir(new URL("public/legacy/images/plants/", root)))
  .filter((file) => /\.(jpe?g|png|webp|gif)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, "zh-CN"));
const index: Record<string, string> = {};
for (const file of files) {
  const name = file.replace(/\.[^.]+$/, "");
  index[name] ??= file;
}
await writeFile(
  new URL("src/data/plant-images.json", root),
  JSON.stringify(index, null, 2) + "\n",
  "utf8",
);
console.log(`照片索引已更新：${Object.keys(index).length} 个名称。`);
