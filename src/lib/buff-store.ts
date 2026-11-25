import fs from 'fs';
import path from 'path';
import type { BuffServerOverride } from '@/lib/catalog/buff-badges';

const BUFF_OVERRIDES_FILE = path.join(process.cwd(), 'data', 'buff_overrides.json');

export function loadBuffOverrides(): Record<string, BuffServerOverride> {
  try {
    if (fs.existsSync(BUFF_OVERRIDES_FILE)) {
      return JSON.parse(fs.readFileSync(BUFF_OVERRIDES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading buff_overrides.json:', e);
  }
  return {};
}

export function saveBuffOverrides(overrides: Record<string, BuffServerOverride>): boolean {
  try {
    const dir = path.dirname(BUFF_OVERRIDES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BUFF_OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving buff_overrides.json:', e);
    return false;
  }
}
