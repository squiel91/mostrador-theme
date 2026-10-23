import Tiendu from '@tiendu/sdk'

// One SDK instance owns the shopper session across every feature.
export const client = Tiendu({ search: { suggestions: ['Milanesas', 'Papas', 'Empanadas', 'Yerba'] } })
