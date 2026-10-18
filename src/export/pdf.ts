import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Resultado, fmt } from '../calc/core';
import { InfoProjeto } from '../state';

const AZUL: [number, number, number] = [15, 58, 99];
const LARANJA: [number, number, number] = [232, 119, 34];
const COR_STATUS: Record<string, [number, number, number]> = {
  ok: [220, 243, 228], alerta: [255, 243, 205], erro: [253, 222, 222], info: [228, 238, 250],
};
const ROTULO_STATUS: Record<string, string> = { ok: 'OK', alerta: 'ATENÇÃO', erro: 'NÃO ATENDE', info: 'INFO' };

let fontes: { normal: string; bold: string } | null = null;

async function base64DeUrl(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function carregarFontes(doc: jsPDF) {
  if (!fontes) {
    fontes = {
      normal: await base64DeUrl('./fonts/DejaVuSansCondensed.ttf'),
      bold: await base64DeUrl('./fonts/DejaVuSansCondensed-Bold.ttf'),
    };
  }
  doc.addFileToVFS('DejaVu.ttf', fontes.normal);
  doc.addFont('DejaVu.ttf', 'DejaVu', 'normal');
  doc.addFileToVFS('DejaVu-Bold.ttf', fontes.bold);
  doc.addFont('DejaVu-Bold.ttf', 'DejaVu', 'bold');
  doc.setFont('DejaVu', 'normal');
}

const v = (x: number | string, dec?: number) => (typeof x === 'number' ? fmt(x, dec ?? 2) : x);

export async function gerarPdf(info: InfoProjeto, resultados: Resultado<unknown>[], cabecalhoDados?: { label: string; valor: string }[]): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await carregarFontes(doc);
  const W = doc.internal.pageSize.getWidth();
  const M = 14;

  // Capa / cabeçalho
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(16);
  doc.text('Memória de Cálculo', M, 13);
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(10);
  doc.text('Calculadora de Campo – dimensionamento preliminar de sistemas de abastecimento', M, 20);
  doc.setFillColor(...LARANJA);
  doc.rect(0, 30, W, 1.5, 'F');
  doc.setTextColor(30, 30, 30);

  const linhasProj = [
    ['Estudo', info.nome || '—'],
    ['Local', info.local || '—'],
    ['Responsável', info.responsavel || '—'],
    ['Data', new Date().toLocaleString('pt-BR')],
    ...(info.observacoes ? [['Observações', info.observacoes]] : []),
    ...(cabecalhoDados ?? []).map((d) => [d.label, d.valor]),
  ];
  autoTable(doc, {
    startY: 36, body: linhasProj, theme: 'plain', margin: { left: M, right: M },
    styles: { font: 'DejaVu', fontSize: 9, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  });

  for (const r of resultados) {
    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFillColor(...AZUL);
    doc.rect(M, y - 5, W - 2 * M, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('DejaVu', 'bold');
    doc.setFontSize(11.5);
    doc.text(r.titulo, M + 2, y);
    doc.setTextColor(30, 30, 30);

    autoTable(doc, {
      startY: y + 5, margin: { left: M, right: M }, head: [['Resultado', 'Valor']],
      body: r.resumo.map((s) => [s.label, `${v(s.valor, s.dec)} ${s.unidade ?? ''}`]),
      styles: { font: 'DejaVu', fontSize: 9 }, headStyles: { fillColor: LARANJA, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
    });
    if (r.entradas.length) {
      autoTable(doc, {
        margin: { left: M, right: M }, head: [['Dado de entrada', 'Valor']],
        body: r.entradas.map((e) => [e.label, `${v(e.valor, typeof e.valor === 'number' && Math.abs(e.valor) < 1e-3 && e.valor !== 0 ? 3 : undefined)} ${e.unidade ?? ''}`]),
        styles: { font: 'DejaVu', fontSize: 8.5 }, headStyles: { fillColor: AZUL, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
      });
    }
    autoTable(doc, {
      margin: { left: M, right: M }, head: [['#', 'Etapa', 'Fórmula / substituição', 'Resultado', 'Ref.']],
      body: r.passos.map((p, i) => [
        String(i + 1), p.titulo, p.subst ? `${p.formula}\n${p.subst}` : p.formula,
        `${v(p.valor, p.dec)} ${p.unidade ?? ''}`, p.ref ?? '',
      ]),
      styles: { font: 'DejaVu', fontSize: 8, cellPadding: 1.4, valign: 'middle' },
      headStyles: { fillColor: AZUL, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 40 }, 3: { cellWidth: 28, halign: 'right' }, 4: { cellWidth: 28, fontSize: 7, textColor: [90, 90, 90] } },
    });
    autoTable(doc, {
      margin: { left: M, right: M }, head: [['Verificação', 'Situação', 'Comentário', 'Ref.']],
      body: r.verificacoes.map((c) => [c.titulo, ROTULO_STATUS[c.status], c.msg, c.ref ?? '']),
      styles: { font: 'DejaVu', fontSize: 8, cellPadding: 1.4 },
      headStyles: { fillColor: AZUL, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 22, fontStyle: 'bold' }, 3: { cellWidth: 30, fontSize: 7, textColor: [90, 90, 90] } },
      didParseCell: (d) => {
        if (d.section === 'body') {
          const st = r.verificacoes[d.row.index]?.status;
          if (st) d.cell.styles.fillColor = COR_STATUS[st];
        }
      },
    });
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('DejaVu', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Dimensionamento preliminar para estudos de viabilidade – não substitui o projeto executivo nem o estudo de transientes.', M, 290);
    doc.text(`Página ${i} de ${n}`, W - M, 290, { align: 'right' });
  }
  return doc.output('blob');
}
