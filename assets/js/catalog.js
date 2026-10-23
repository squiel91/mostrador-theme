import { $, $$, notify } from '@mostrador/dom'
import { readProducts } from '@mostrador/products'
import { renderCart } from '@mostrador/cart'
import { renderWishlist } from '@mostrador/shopper'

export function initCatalog() {
  document.addEventListener('click', async event => {
    const trigger = event.target.closest('button, a')
    if (!trigger || trigger.disabled) return
    if (trigger.matches('[data-post-filter]')) {
      const value = trigger.dataset.postFilter
      $$('[data-post-filter]').forEach(button => button.classList.toggle('is-on', button === trigger))
      $$('[data-post-grid] [data-post-category]').forEach(card => { card.hidden = value !== 'all' && card.dataset.postCategory !== value })
    }
    if (trigger.matches('[data-load-more]')) {
      event.preventDefault()
      if (trigger.getAttribute('aria-busy') === 'true') return
      trigger.setAttribute('aria-busy', 'true')
      try {
        const response = await fetch(trigger.href)
        if (!response.ok) throw new Error('No pudimos cargar más productos.')
        const nextPage = new DOMParser().parseFromString(await response.text(), 'text/html')
        const nextGrid = $('[data-grid]', nextPage), grid = $('[data-grid]')
        if (!nextGrid || !grid) throw new Error('No pudimos cargar más productos.')
        readProducts(nextPage)
        nextGrid.querySelectorAll(':scope > *').forEach(card => grid.append(document.importNode(card, true)))
        const oldPager = trigger.closest('[data-pager]'), nextPager = $('[data-pager]', nextPage)
        if (nextPager) oldPager.replaceWith(document.importNode(nextPager, true)); else oldPager.remove()
        const range = $('[data-results-range]'), visible = $$('[data-product-card]', grid).length
        if (range) range.textContent = `Mostrando 1–${visible} de ${$('[data-catalog]').dataset.total}`
        renderCart(); renderWishlist()
      } catch (error) { notify(error.message); trigger.removeAttribute('aria-busy') }
    }
  })

  document.addEventListener('change', event => {
    const control = event.target
    if (!control.matches('[data-sort], [data-instock]')) return
    if (control.type === 'radio' && !control.checked) return
    const url = new URL(location.href)
    url.searchParams.delete('page')
    if (control.matches('[data-instock]')) {
      $$('[data-instock]').forEach(input => { input.checked = control.checked })
      if (control.checked) url.searchParams.set('available', 'true'); else url.searchParams.delete('available')
    } else url.searchParams.set('sort', control.value)
    location.href = url.href
  })
}
