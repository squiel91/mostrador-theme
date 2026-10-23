// Shared shopping data; SDK responses are authoritative for cart state.

export const products = new Map()
export const purchases = new Map()
export let cart = { quantity: 0, subtotal: 0, currency: 'UYU', lines: [] }

export function setCart(nextCart) { cart = nextCart }
export const variantQuantity = id => cart.lines.filter(line => String(line.variantId) === String(id)).reduce((sum, line) => sum + line.quantity, 0)
