// DOM helpers, formatting and the shared live status message.

export const $ = (selector, root = document) => root.querySelector(selector)
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const money = (cents, currency = 'UYU') => cents == null ? 'A consultar' : new Intl.NumberFormat('es-UY', {
  style: 'currency', currency, minimumFractionDigits: currency === 'UYU' ? 0 : 2, maximumFractionDigits: currency === 'UYU' ? 0 : 2
}).format(cents / 100)
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let statusTimer
export function notify(message) {
  const target = $('[data-global-status]')
  if (!target) return
  clearTimeout(statusTimer)
  target.textContent = message
  target.hidden = !message
  if (message) statusTimer = setTimeout(() => { target.hidden = true }, 6500)
}
