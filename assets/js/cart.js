import { $, $$, money, escapeHTML, notify } from '@mostrador/dom'
import { client } from '@mostrador/client'
import { products, purchases, cart, setCart, variantQuantity } from '@mostrador/state'
import { renderPurchase } from '@mostrador/products'
import { closeSheets } from '@mostrador/dialogs'

let cartQueue = Promise.resolve()
const CART_FIELDS = 'quantity subtotal currency lines { id variantId quantity note isNoteVisible unitPrice subtotal product { id title url coverImage { url alt } } variant { stock available } }'
export function renderCart() {
  $$('[data-cart-count]').forEach(el => { el.textContent = cart.quantity })
  $$('[data-cart-total]').forEach(el => { el.textContent = money(cart.subtotal, cart.currency) })
  document.body.classList.toggle('has-cart', cart.quantity > 0)
  $$('[data-free-shipping-cents]').forEach(wrapper => {
    const threshold = Math.max(0, Number(wrapper.dataset.freeShippingCents) || 0)
    const region = escapeHTML(wrapper.dataset.freeShippingRegion)
    const remaining = Math.max(0, threshold - cart.subtotal)
    $('[data-ship-msg]', wrapper).innerHTML = remaining
      ? `Te faltan <b>${escapeHTML(money(remaining, cart.currency))}</b> para el envío gratis en ${region}`
      : `<b>Alcanzaste el mínimo de envío gratis</b> en ${region}`
    $('[data-ship-bar]', wrapper).style.width = `${threshold ? Math.min(100, cart.subtotal / threshold * 100) : 100}%`
  })
  $$('[data-quick-add]').forEach(control => {
    const id = control.dataset.variantId
    const quantity = variantQuantity(id)
    const variant = products.get(control.dataset.quickAdd)?.variants.find(v => String(v.id) === String(id))
    control.classList.toggle('is-active', quantity > 0)
    $('output', control).textContent = quantity
    $('[data-qa-minus]', control).disabled = quantity <= 0
    $('[data-qa-plus]', control).disabled = variant?.stock != null && quantity >= variant.stock
  })
  $$('[data-mini-lines]').forEach(container => {
    container.replaceChildren()
    if (!cart.lines.length) {
      const empty = document.createElement('p'); empty.className = 'small muted'; empty.textContent = 'Tu pedido está vacío.'; container.append(empty)
    }
    cart.lines.slice(0, 4).forEach(line => {
      const row = document.createElement('div'); row.className = 'mini-line'
      const label = document.createElement(line.product?.url ? 'a' : 'span')
      label.textContent = `${line.quantity} × ${line.product?.title ?? 'Producto'}`
      if (line.product?.url) label.href = line.product.url
      const price = document.createElement('b'); price.textContent = money(line.subtotal, cart.currency)
      row.append(label, price); container.append(row)
    })
    if (cart.lines.length > 4) {
      const extra = document.createElement('p'); extra.className = 'small muted'; extra.textContent = `Y ${cart.lines.length - 4} productos más`; container.append(extra)
    }
  })
  for (const id of purchases.keys()) renderPurchase(id)
}

async function readCart() {
  const data = await client.query(`{ cart { ${CART_FIELDS} } }`)
  setCart(data.cart)
  renderCart()
  return cart
}

function queueCart(action, trigger) {
  const busy = trigger?.closest('[data-quick-add], [data-purchase]') ?? trigger
  if (busy) { busy.setAttribute('aria-busy', 'true'); busy.classList.add('is-busy') }
  const run = cartQueue.catch(() => {}).then(action).catch(async error => {
    // Stock clamping can change a cart even when a helper throws a business error.
    try { await readCart() } catch {}
    notify(error instanceof Error ? error.message : 'No pudimos actualizar el pedido. Intentá otra vez.')
  }).finally(() => {
    if (busy) { busy.removeAttribute('aria-busy'); busy.classList.remove('is-busy') }
  })
  cartQueue = run
  return run
}

export function refreshCart() { return queueCart(readCart) }

async function addVariant(product, variant, quantity) {
  await client.cart.add({ id: variant.id, priceInCents: variant.priceInCents }, quantity, {
    title: product.title, currency: product.currency, basePriceInCents: product.priceMinInCents
  })
  await readCart()
}

async function changeQuickQuantity(control, delta) {
  const product = products.get(control.dataset.quickAdd)
  const variant = product.variants.find(v => String(v.id) === control.dataset.variantId)
  if (delta > 0) return addVariant(product, variant, 1)
  // Preserve separate note groups: decrement an existing line, never replace all groups.
  const lines = cart.lines.filter(line => String(line.variantId) === String(variant.id))
  const line = lines.find(line => !line.note) ?? lines.at(-1)
  if (!line) return
  const result = await client.mutate(`mutation($lines:[CartLineUpdateInput!]!) {
    cartLinesUpdate(lines:$lines) { cart { ${CART_FIELDS} } session { token } userErrors { code message } }
  }`, { lines: [{ id: line.id, quantity: Math.max(0, line.quantity - 1) }] })
  setCart(result.cartLinesUpdate.cart)
  renderCart()
  if (result.cartLinesUpdate.userErrors.length) notify(result.cartLinesUpdate.userErrors[0].message)
}

export function waitForCart() { return cartQueue }

export function initCart() {
  document.addEventListener('click', async event => {
    const trigger = event.target.closest('button, a')
    if (!trigger || trigger.disabled) return
    if (trigger.matches('[data-qa-add], [data-qa-plus], [data-qa-minus]')) {
      const control = trigger.closest('[data-quick-add]')
      if (control.getAttribute('aria-busy') === 'true') return
      const adding = trigger.matches('[data-qa-add]')
      await queueCart(() => changeQuickQuantity(control, trigger.matches('[data-qa-minus]') ? -1 : 1), trigger)
      if (adding && control.classList.contains('is-active') && document.activeElement === trigger) $('[data-qa-plus]', control).focus({ preventScroll: true })
      return
    }
    const purchaseRoot = trigger.closest('[data-purchase]')
    if (purchaseRoot && trigger.matches('[data-pdp-add]')) {
      const id = purchaseRoot.dataset.purchase, product = products.get(id), state = purchases.get(id)
      if (purchaseRoot.getAttribute('aria-busy') === 'true') return
      const variant = state.variant, quantity = state.quantity
      await queueCart(async () => {
        await addVariant(product, variant, quantity)
        const status = $('[data-purchase-status]', purchaseRoot)
        if (status) status.textContent = `Agregaste ${quantity} al pedido.`
        if (purchaseRoot.closest('#elegir')) closeSheets()
        notify(`Agregaste ${quantity} ${product.title} al pedido.`)
      }, trigger)
      return
    }
  })
  window.addEventListener('tiendu:overlay-close', refreshCart)
  window.addEventListener('pageshow', refreshCart)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshCart() })
  renderCart()
  refreshCart()
}
