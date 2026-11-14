// Copies the JSON blocks of design.md and product.md into the film template.
import { readFile, writeFile } from 'node:fs/promises';
const pick = async (file, tag) => {
  const md = await readFile(file, 'utf8');
  const m = md.match(new RegExp('```json ' + tag + '\\n([\\s\\S]*?)```'));
  if (!m) throw new Error(`${file}: no \`\`\`json ${tag} block`);
  return JSON.parse(m[1]);
};
await writeFile('video/src/design.json', JSON.stringify(await pick('design.md', 'design-tokens'), null, 2));
await writeFile('video/src/product.json', JSON.stringify(await pick('product.md', 'film'), null, 2));
console.log('synced design.md, product.md -> video/src/*.json');
