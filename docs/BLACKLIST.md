# Blacklist Configuration Guide

## Overview

O sistema de blacklist permite filtrar automaticamente ofertas indesejadas baseado em palavras-chave e expressões regulares.

## Configuration

Adicione a seguinte seção no seu `config.json`:

```json
{
  "blacklist": {
    "enabled": true,
    "keywords": [
      "replica",
      "fake",
      "scam",
      "falsificado",
      "pirateado",
      "contrabando"
    ],
    "regex": [
      "\\b(cheap|baixa qualidade)\\b",
      "\\b(usado|quebrado)\\b",
      "replica oficial",
      "promoção falsa"
    ]
  }
}
```

## How It Works

O blacklist funciona em 3 níveis:

1. **Keywords**: Palavras ou frases exatas (case-insensitive)
   - Exemplo: `"fake"` bloqueará "Fake Rolex", "fake product", etc.

2. **Regex**: Expressões regulares para padrões mais complexos
   - Exemplo: `"\\b(usado|quebrado)\\b"` bloqueará "produto usado" mas não "reuso"

3. **Multi-campo**: Verifica título, descrição e marca da oferta

## Examples

### Keywords
```json
"keywords": [
  "replica",          // Block ANY product with "replica"
  "fake watch",       // Block "fake watch" specifically
  "low quality"       // Block products mentioning low quality
]
```

### Regex Patterns
```json
"regex": [
  "\\bcopy\\b",                // Word boundaries for exact "copy"
  "(fake|falso|falsificado)",  // Multiple alternatives
  "\\d+\\s*reais",             // Prices in specific format
  "^(não|never)\\s+compre"     // Phrases starting with warnings
]
```

## Testing Blacklist

Use o endpoint `/api/stats/analytics` para ver quantas ofertas foram filtradas:

```bash
curl http://localhost:3000/api/stats/analytics?days=7
```

## Reload Configuration

O blacklist é carregado automaticamente no startup. Para recarregar após editar `config.json`:

- Opção 1: Reiniciar o backend
- Opção 2: Será implementado endpoint `/api/config/reload` (futuro)

## Performance

- Keywords: O(n) - muito rápido
- Regex: O(n * m) onde m = número de patterns - moderado

**Recomendação**: Use keywords sempre que possível, regex apenas para padrões complexos.

## Common Patterns

### E-commerce Scams
```json
"keywords": [
  "replica",
  "fake",
  "counterfeit",
  "falsificado",
  "pirateado"
]
```

### Low Quality Indicators
```json
"keywords": [
  "baixa qualidade",
  "low quality",
  "cheap material",
  "material barato"
]
```

### Prohibited Items (Example)
```json
"keywords": [
  "arma",
  "weapon",
  "prohibited",
  "proibido"
]
```

## Monitoring

Logs mostrarão:

```
🚫 Blacklisted offer: Fake Rolex Watch - Amazing...
🚫 Filtered out 15 blacklisted offers
```

## API Endpoints

### Get Blacklist Stats
```bash
GET /api/stats/analytics
```

Response includes filtered count.

## Tips

1. **Start Conservative**: Comece com poucas keywords, adicione mais conforme necessário
2. **Test Regex**: Use [regex101.com](https://regex101.com/) para testar patterns
3. **Case Sensitivity**: Keywords são case-insensitive, regex depende do flag `i`
4. **Monitor Logs**: Verifique quais ofertas estão sendo bloqueadas

## Troubleshooting

### Too Many Blocked?
- Reduza keywords genéricas
- Use regex mais específicas

### Not Blocking Enough?
- Adicione variações de palavras
- Use regex para padrões

### False Positives?
- Revise keywords muito genéricas
- Use word boundaries em regex: `\\bfake\\b`
