# Calculadora de Campo

App Android (e web/PWA) para **dimensionamento rápido em campo** de sistemas de abastecimento de água — visitas técnicas e análises preliminares de viabilidade.

## Módulos

| Módulo | O que calcula |
|---|---|
| **Dados** | População de projeto (residências × ocupação ou população informada, crescimento geométrico), Qm, Qmd, Qmh |
| **Adutora** | Vazão de adução (18 h, perdas no tratamento), diâmetro econômico (Forchheimer/Bresse) e DN comercial, perdas (Universal e Hazen-Williams), Hmt, golpe de aríete (Allievi/Joukowsky), potência do conjunto motobomba |
| **Reservação** | Volume de regularização (1/3 do volume do dia de maior consumo), incêndio/emergência, verificações da NIT-0048 |
| **Filtro** | Filtro ascendente: área, diâmetro, taxa real, fluidização (Wen & Yu), expansão por subcamadas (Di Bernardo/Libânio), altura total, calha, perdas na filtração (Kozeny-Carman), espinha de peixe |
| **Lavagem** | Bomba de lavagem: perdas no leito, suporte e drenagem, sucção e recalque (Swamee-Jain), Hm, potência comercial, volume do RAP |

Cada módulo mostra **resultados**, **verificações normativas** (OK / atenção / não atende) e a **memória de cálculo** completa (fórmula, valores substituídos e referência). A memória pode ser **exportada em PDF ou Excel** — por módulo ou completa. Os estudos ficam salvos no aparelho (com duplicação e backup em `.json`).

Critérios: NBR 12211/12214/12215/12216/12217 e normas internas NIT-0045 (condutos forçados), NIT-0046 (ETA), NIT-0047 (elevatórias), NIT-0048 (reservatórios) e ITCOA241. Veja [docs/ESPECIFICACAO.md](docs/ESPECIFICACAO.md).

> Dimensionamento preliminar. Não substitui o projeto executivo nem o estudo de transientes hidráulicos.

## Baixar o APK

A cada push na `main` o GitHub Actions compila o APK: **Actions → Build APK Android → (execução) → Artifacts → `calculadora-campo-apk`**.
Para gerar uma versão com release: crie uma tag `v1.0.0` (o APK é anexado à release).

O APK é *debug* (instalação direta; no Android habilite "instalar apps de fontes desconhecidas"). Para publicar na Play Store é preciso configurar a assinatura (keystore) — ver "Próximos passos".

## Desenvolvimento

```bash
npm install
npm run dev        # app no navegador (http://localhost:5173)
npm test           # testes do motor de cálculo (comparados com a planilha revisada)
npm run build      # build web em dist/
npm run android:add && npx cap sync android   # gera o projeto Android (precisa do Android SDK para compilar)
```

Estrutura:

```
src/calc/      motor de cálculo puro (TypeScript, sem dependência de interface)
src/ui/        definição dos campos de entrada
src/export/    geração de PDF (jsPDF) e Excel (ExcelJS) e compartilhamento no Android
src/state.ts   estudos salvos (localStorage)
tests/         testes com valores de referência da planilha "DIMENSIONAMENTO ETA - revisada v2"
scripts/       geração de fontes/ícones (binários não versionados)
```

Tecnologia: Vite + TypeScript, Capacitor 6 (Android), jsPDF + autotable, ExcelJS. Fonte DejaVu (licença livre) no PDF para símbolos técnicos.
