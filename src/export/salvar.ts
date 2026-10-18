import { Capacitor } from '@capacitor/core';

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Salva/compartilha um arquivo. No Android abre a folha de compartilhamento; no navegador faz download. */
export async function salvarArquivo(blob: Blob, nome: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const data = await blobParaBase64(blob);
    const res = await Filesystem.writeFile({ path: nome, data, directory: Directory.Cache });
    await Share.share({ title: nome, text: 'Memória de cálculo – Calculadora de Campo', url: res.uri, dialogTitle: 'Salvar ou enviar' });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function nomeArquivo(projeto: string, sufixo: string, ext: string): string {
  const base = projeto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'estudo';
  const d = new Date();
  const data = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${base}_${sufixo}_${data}.${ext}`;
}
