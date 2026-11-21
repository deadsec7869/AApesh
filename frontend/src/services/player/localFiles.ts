import type { Track } from '@/types/music';

// Files remain in memory for this session; object URLs belong to the active provider.
const files = new Map<string, File>();
export function registerLocalFiles(selected: Iterable<File>): Track[] {
  const tracks: Track[] = [];
  for (const file of selected) {
    if (!/\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i.test(file.name) && !file.type.startsWith('audio/')) continue;
    const id = `local:${crypto.randomUUID()}`;
    files.set(id, file);
    tracks.push({ videoId: id, source: 'local', title: file.name.replace(/\.[^.]+$/, ''), artists: [{ name: 'Local file' }] });
  }
  return tracks;
}
export function getLocalFile(id: string): File | undefined { return files.get(id); }
export function forgetLocalFile(id: string): void { files.delete(id); }
