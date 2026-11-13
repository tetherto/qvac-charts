export interface Tile {
  code: string
  name: string
  col: number
  row: number
}

// A tile grid: each state is one square at a fixed spot that keeps the country's outline.
export const brazil: ReadonlyArray<Tile> = [
  { code: 'AC', name: 'Acre', col: 0, row: 2 },
  { code: 'AL', name: 'Alagoas', col: 5, row: 3 },
  { code: 'AP', name: 'Amapá', col: 2, row: 0 },
  { code: 'AM', name: 'Amazonas', col: 1, row: 1 },
  { code: 'BA', name: 'Bahia', col: 3, row: 3 },
  { code: 'CE', name: 'Ceará', col: 4, row: 1 },
  { code: 'DF', name: 'Distrito Federal', col: 2, row: 4 },
  { code: 'ES', name: 'Espírito Santo', col: 4, row: 4 },
  { code: 'GO', name: 'Goiás', col: 2, row: 3 },
  { code: 'MA', name: 'Maranhão', col: 3, row: 1 },
  { code: 'MT', name: 'Mato Grosso', col: 1, row: 3 },
  { code: 'MS', name: 'Mato Grosso do Sul', col: 1, row: 4 },
  { code: 'MG', name: 'Minas Gerais', col: 3, row: 4 },
  { code: 'PA', name: 'Pará', col: 2, row: 1 },
  { code: 'PB', name: 'Paraíba', col: 5, row: 2 },
  { code: 'PR', name: 'Paraná', col: 1, row: 5 },
  { code: 'PE', name: 'Pernambuco', col: 4, row: 2 },
  { code: 'PI', name: 'Piauí', col: 3, row: 2 },
  { code: 'RJ', name: 'Rio de Janeiro', col: 3, row: 5 },
  { code: 'RN', name: 'Rio Grande do Norte', col: 5, row: 1 },
  { code: 'RS', name: 'Rio Grande do Sul', col: 1, row: 7 },
  { code: 'RO', name: 'Rondônia', col: 1, row: 2 },
  { code: 'RR', name: 'Roraima', col: 1, row: 0 },
  { code: 'SC', name: 'Santa Catarina', col: 1, row: 6 },
  { code: 'SP', name: 'São Paulo', col: 2, row: 5 },
  { code: 'SE', name: 'Sergipe', col: 4, row: 3 },
  { code: 'TO', name: 'Tocantins', col: 2, row: 2 }
]
