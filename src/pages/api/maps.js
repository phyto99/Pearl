import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  const manifestPath = path.join(process.cwd(), 'public', 'maps', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  res.status(200).json(manifest);
}
