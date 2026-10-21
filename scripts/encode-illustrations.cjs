// Encode generated originals for web delivery without altering their composition.
// Usage: node scripts/encode-illustrations.cjs [absolute path to the sharp package]
const sharp = require(process.argv[2] || "sharp");
const fs = require("node:fs/promises");
const path = require("node:path");
async function main() {
  const root = path.resolve(__dirname, "../public/illustrations");
  const names = await fs.readdir(path.join(root, "articles"));
  const files = ["botanical-garden.png", ...names.filter(n => n.endsWith(".png")).map(n => "articles/" + n)];
  let original = 0, encoded = 0;
  for (const file of files) {
    const source = path.join(root, file);
    const target = source.replace(/\.png$/, ".webp");
    if (target === source) throw new Error("Refusing to overwrite an original");
    const info = await sharp(source).webp({ quality: 86, effort: 6, alphaQuality: 100 }).toFile(target);
    original += (await fs.stat(source)).size;
    encoded += info.size;
    console.log(file, "->", info.size, "bytes");
  }
  console.log(JSON.stringify({ original, encoded, reduction: 1 - encoded / original }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
