# Especificação dos cálculos – v1

Base: planilha `DIMENSIONAMENTO ETA.xlsx` revisada (rodadas 1 e 2) e decisões do responsável técnico.

## Decisões adotadas
- Taxa de filtração (filtro ascendente): **120 m³/m²·d** (NBR 12216).
- Espessura do leito filtrante: **1,25 m** (um único leito para filtração e expansão).
- Hg da bomba de lavagem: **entrada** – desnível entre o nível mínimo do RAP e a borda da calha.
- Recalque da lavagem: **diâmetro e comprimento informados**; o app calcula Re, f, J e perdas.
- Tempo de bombeamento padrão: **18 h** (NIT-0047 5.7.8.3).
- Fórmula de perda padrão na adutora: **Universal** (NIT-0045 5.3.7), com Hazen-Williams calculada para comparação.
- Diâmetro econômico padrão: **Forchheimer** (bombeamento < 24 h); DN = próximo comercial ≥ calculado (pode ser fixado).
- Potências: próximo valor comercial ≥ potência com folga (Azevedo Netto); 1 + 1 reserva instalada.
- RAP: volume para lavar **todos os filtros** (situação crítica – NIT-0046 4.3.16), arredondado a 10 m³.

## Diferenças em relação à planilha
- Porosidade expandida (Pei) resolvida por iteração (bisseção). Subcamadas com Vmf > Vlav não fluidizam
  (Pei = P inicial); a planilha forçava a solução nessas camadas. Efeito na expansão: 21,0% → 20,9%.
- γ = ρ·g (planilha usava 9765 N/m³ fixo; diferença < 0,1%).
- g = 9,81 m/s² em todos os cálculos (planilha usava 9,8 na espinha de peixe).

## Verificações normativas implementadas
| Critério | Fonte |
|---|---|
| Velocidade adutora 0,6 (bruta) / 0,3 (tratada) a 3,0 m/s | NIT-0045 5.3.8.1 |
| J ≤ 0,008 m/m | NIT-0045 5.3.9 |
| DN ≥ 50 mm | NIT-0045 5.3.10 |
| Hmt ≤ PSA / 1,15 | NIT-0045 5.3.6 |
| Pressão com golpe ≤ PSA; estudo de transientes; ventosas a cada ~800 m | NIT-0045 5.5 / 5.4.4 |
| Sucção: não afogada ≤ 0,90 m/s; afogada pela tabela por DN | NIT-0047 5.7.13.2/3, NBR 12214 |
| Recalque 0,6–3,0 m/s; pré-dimensionamento V ≈ 1 m/s | NIT-0045, NIT-0047 5.7.15 |
| Taxa de filtração ≤ 120 m³/m²·d | NBR 12216 |
| Expansão 20–30% | NBR 12216, ITCOA241 |
| Reservação: 1/3 Vd; ≤ 100 m³ todo elevado; ≥ 500 m³ 2 câmaras; < 50 L/s tomada carro-pipa; folgas | NIT-0048 |

## Pendências
- Tabela 1 (velocidade na sucção afogada) e Tabela 2 (folgas de potência) do Anexo I da NIT-0047 – usados valores da NBR 12214 / Azevedo Netto.
- Gráfico do fator de correção do volume elevado (Anexo I da NIT-0048) – ilegível no PDF recebido.
- Unificar a granulometria do leito (expansão 0,59–2,00 mm × filtração 1,00–2,40 mm) – ambas editáveis em "Avançado".
