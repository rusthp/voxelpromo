# Logo VOXELPROMO

## Design

A logo do VOXELPROMO consiste em um cubo 3D voxelizado (isométrico) com três faces coloridas:

- **Face Superior (Top)**: Azul (#2563EB a #DBEAFE)
- **Face Esquerda (Left)**: Rosa/Magenta (#DB2777 a #FCE7F3)
- **Face Direita (Right)**: Laranja (#EA580C a #FFEDD5)

O cubo é renderizado em projeção isométrica, mostrando as três faces visíveis. Cada face é composta por uma grade 3x3 de quadrados menores (voxels), criando um efeito pixelado/blocky.

Abaixo do cubo, o texto "VOXELPROMO" é exibido em maiúsculas, com fonte sans-serif bold.

## Uso

### Componente React

```tsx
import { Logo } from '@/components/Logo'

// Tamanho grande com texto
<Logo size="xl" showText={true} />

// Tamanho médio sem texto
<Logo size="md" showText={false} />
```

### Tamanhos Disponíveis

- `sm`: 40px (texto: text-lg)
- `md`: 60px (texto: text-2xl)
- `lg`: 80px (texto: text-3xl) - padrão
- `xl`: 120px (texto: text-5xl)

### Propriedades

- `size`: Tamanho do cubo ('sm' | 'md' | 'lg' | 'xl')
- `showText`: Mostrar texto "VOXELPROMO" (boolean)
- `className`: Classes CSS adicionais (string)

## Cores

### Azul (Top Face)
- `#2563EB` - Azul escuro
- `#3B82F6` - Azul médio
- `#60A5FA` - Azul claro
- `#93C5FD` - Azul muito claro
- `#DBEAFE` - Azul extremamente claro

### Rosa/Magenta (Left Face)
- `#DB2777` - Rosa escuro
- `#EC4899` - Rosa médio
- `#F472B6` - Rosa claro
- `#FBCFE8` - Rosa muito claro
- `#FCE7F3` - Rosa extremamente claro

### Laranja (Right Face)
- `#EA580C` - Laranja escuro
- `#F97316` - Laranja médio
- `#FB923C` - Laranja claro
- `#FED7AA` - Laranja muito claro
- `#FFEDD5` - Laranja extremamente claro

## Arquivos

- `frontend/components/Logo.tsx` - Componente React da logo
- `frontend/public/favicon.svg` - Favicon SVG
- `frontend/components/VoxelCube.tsx` - Componente isolado do cubo (opcional)

## Implementação

A logo é renderizada usando SVG com:
- Projeção isométrica para o efeito 3D
- Gradientes de cor em cada face
- Sombra para profundidade
- Responsivo e escalável

