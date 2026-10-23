import { $$, notify } from '@mostrador/dom'
import { client } from '@mostrador/client'
import { waitForCart } from '@mostrador/cart'
import { closeSheets } from '@mostrador/dialogs'

let wishlist = new Set(), shopperRead = 0
export function renderWishlist() {
  $$('[data-wishlist-product]').forEach(button => {
    const saved = wishlist.has(button.dataset.wishlistProduct)
    button.setAttribute('aria-pressed', String(saved))
    button.setAttribute('aria-label', `${saved ? 'Quitar' : 'Guardar'} ${button.dataset.productTitle} ${saved ? 'de' : 'en'} favoritos`)
  })
}
async function refreshShopper() {
  const version = ++shopperRead
  try {
    const status = await client.shopper.getStatus()
    if (version !== shopperRead) return
    wishlist = new Set(status.wishlistProductIds.map(String)); renderWishlist()
    $$('[data-open-account]').forEach(button => button.setAttribute('aria-label', status.shopper?.name ? `Mi cuenta, ${status.shopper.name}` : 'Ingresar'))
    $$('[data-account-label]').forEach(label => { label.textContent = status.shopper ? 'Mi cuenta' : 'Ingresar' })
  } catch { /* Browsing remains available; an account action can retry. */ }
}

export function initShopper() {
  document.addEventListener('click', async event => {
    const trigger = event.target.closest('button, a')
    if (!trigger || trigger.disabled) return
    if (trigger.matches('[data-open-checkout], [data-open-account], [data-open-wishlist], [data-wishlist-product]')) {
      event.preventDefault(); await closeSheets()
      trigger.disabled = true
      try {
        if (trigger.matches('[data-open-checkout]')) { await waitForCart(); await client.checkout.open() }
        else if (trigger.matches('[data-open-account]')) await client.shopper.open()
        else if (trigger.matches('[data-open-wishlist]')) await client.wishlist.open()
        else {
          const productId = trigger.dataset.wishlistProduct
          const { shopper } = await client.shopper.getStatus()
          if (!shopper) await client.shopper.open({ productId })
          else { await client.wishlist.toggle(productId); await refreshShopper() }
        }
      } catch (error) { notify(error.message) }
      finally { trigger.disabled = false }
    }
  })
  window.addEventListener('tiendu:overlay-close', refreshShopper)
  window.addEventListener('tiendu:shopper-status', refreshShopper)
  refreshShopper()
}
