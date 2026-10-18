import type { Worksheet } from 'exceljs';
import { Resultado } from '../calc/core';
import { InfoProjeto } from '../state';

const AZUL = 'FF0F3A63';
const LARANJA = 'FFE87722';
const COR_STATUS: Record<string, string> = { ok: 'FFDCF3E4', alerta: 'FFFFF3CD', erro: 'FFFDDEDE', info: 'FFE4EEFA' };
const ROTULO_STATUS: Record<string, string> = { ok: 'OK', alerta: 'ATENÇÃO', erro: 'NÃO ATENDE', info: 'INFO' };

function cabecalho(ws: Worksheet, linha: number, valores: string[], cor = AZUL) {
  const r = ws.getRow(linha);
  valores.forEach((t, i) => {
    const c = r.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cor } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });
}

function titulo(ws: Worksheet, linha: number, texto: string) {
  const c = ws.getRow(linha).getCell(1);
  c.value = texto;
  c.font = { bold: true, size: 12, name: 'Arial', color: { argb: AZUL } };
}

export async function gerarExcel(info: InfoProjeto, resultados: Resultado<unknown>[], dadosBasicos?: { label: string; valor: string }[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Calculadora de Campo';
  wb.created = new Date();

  const rs = wb.addWorksheet('Resumo');
  rs.columns = [{ width: 38 }, { width: 22 }, { width: 14 }];
  titulo(rs, 1, 'MEMÓRIA DE CÁLCULO – CALCULADORA DE CAMPO');
  const proj = [
    ['Estudo', info.nome], ['Local', info.local], ['Responsável', info.responsavel],
    ['Data', new Date().toLocaleString('pt-BR')], ['Observações', info.observacoes],
  ];
  proj.forEach(([k, val], i) => { rs.getRow(3 + i).values = [k, val || '—']; rs.getRow(3 + i).getCell(1).font = { bold: true, name: 'Arial' }; });
  let l = 3 + proj.length + 1;
  if (dadosBasicos?.length) {
    cabecalho(rs, l++, ['Dados básicos', 'Valor', '']);
    for (const d of dadosBasicos) rs.getRow(l++).values = [d.label, d.valor];
    l++;
  }
  for (const r of resultados) {
    cabecalho(rs, l++, [r.titulo, 'Valor', 'Unidade'], LARANJA);
    for (const s of r.resumo) {
      const row = rs.getRow(l++);
      row.values = [s.label, s.valor, s.unidade ?? ''];
      if (typeof s.valor === 'number') row.getCell(2).numFmt = s.dec === 0 ? '#,##0' : '#,##0.00';
    }
    l++;
  }
  rs.getRow(l + 1).getCell(1).value = 'Dimensionamento preliminar – não substitui o projeto executivo nem o estudo de transientes.';
  rs.getRow(l + 1).getCell(1).font = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF666666' } };

  for (const r of resultados) {
    const ws = wb.addWorksheet(r.titulo.slice(0, 31).replace(/[\\/?*[\]:]/g, '-'));
    ws.columns = [{ width: 5 }, { width: 42 }, { width: 46 }, { width: 16 }, { width: 12 }, { width: 34 }];
    titulo(ws, 1, r.titulo.toUpperCase());
    let i = 3;
    cabecalho(ws, i++, ['', 'Dado de entrada', 'Valor', 'Unidade']);
    for (const e of r.entradas) {
      ws.getRow(i++).values = ['', e.label, e.valor, e.unidade ?? ''];
    }
    i++;
    cabecalho(ws, i++, ['#', 'Etapa', 'Fórmula / substituição', 'Resultado', 'Unidade', 'Referência']);
    r.passos.forEach((p, k) => {
      const row = ws.getRow(i++);
      row.values = [k + 1, p.titulo, p.subst ? `${p.formula}\n${p.subst}` : p.formula, p.valor, p.unidade ?? '', p.ref ?? ''];
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      if (typeof p.valor === 'number') {
        const dec = p.dec ?? 2;
        row.getCell(4).numFmt = Math.abs(p.valor) < 1e-3 && p.valor !== 0 ? '0.000E+00' : dec === 0 ? '#,##0' : `#,##0.${'0'.repeat(dec)}`;
      }
    });
    i++;
    cabecalho(ws, i++, ['', 'Verificação', 'Comentário', 'Situação', '', 'Referência']);
    for (const c of r.verificacoes) {
      const row = ws.getRow(i++);
      row.values = ['', c.titulo, c.msg, ROTULO_STATUS[c.status], '', c.ref ?? ''];
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_STATUS[c.status] } };
      row.getCell(4).font = { bold: true, name: 'Arial' };
    }
    ws.eachRow((row) => row.eachCell((c) => { if (!c.font?.name) c.font = { ...(c.font ?? {}), name: 'Arial', size: 10 }; }));
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
