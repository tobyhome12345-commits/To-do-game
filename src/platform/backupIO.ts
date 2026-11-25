import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { AppData } from '../model/types';
import { backupFileName, exportJSON } from '../store/backup';
import { isNative } from './native';

/** Export a backup: share sheet on the phone (save to Drive / Files / send to yourself), download in a browser. */
export async function exportBackup(data: AppData): Promise<'shared' | 'downloaded'> {
  const json = exportJSON(data);
  const name = backupFileName();
  if (isNative) {
    const res = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Doable backup', text: `Doable backup (${data.tasks.length} tasks)`, files: [res.uri], dialogTitle: 'Save your Doable backup' });
    return 'shared';
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

/** Read a picked file as text. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
