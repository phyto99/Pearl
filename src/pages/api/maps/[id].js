import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  const { id } = req.query;
  const mapPath = path.join(process.cwd(), 'public', 'maps', `${id}.json`);

  if (!fs.existsSync(mapPath)) {
    return res.status(404).json({ error: 'Map not found' });
  }

  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  res.status(200).json(mapData);
}
