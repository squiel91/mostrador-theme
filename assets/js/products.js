import { $, $$, money, escapeHTML, notify } from '@mostrador/dom'
import { client } from '@mostrador/client'
import { products, purchases, variantQuantity } from '@mostrador/state'
import { openSheet } from '@mostrador/dialogs'

export function readProducts(root = document) {
  $$('[data-product-json]', root).forEach(script => {
    try {
      const product = JSON.parse(script.textContent)
      products.set(String(product.id), product)
      if (!purchases.has(String(product.id))) {
        const variant = product.variants.find(v => v.available && v.priceInCents != null) ?? product.variants[0]
        purchases.set(String(product.id), { variant, quantity: 1 })
      }
    } catch { notify('No pudimos cargar las opciones de un producto. Recargá la página para intentarlo de nuevo.') }
  })
}

function presentation(product, variant) {
  return variant?.selectedOptions?.find(option => option.name === 'Presentación')?.value
    ?? product.specifications?.find(spec => spec.name === 'Presentación')?.value ?? ''
}

// Theme convention: normalize package sizes to kg, liter or one unit.
function unitPrice(product, variant) {
  const label = presentation(product, variant).trim().toLowerCase().replace(',', '.').replace(/\s+/g, '')
  const metric = label.match(/^(\d+(?:\.\d+)?)(kg|mg|g|ml|cl|l)$/)
  const count = label.match(/^x(\d+(?:\.\d+)?)$/)
  let amount, unit
  if (metric) {
    amount = Number(metric[1])
    if (['kg', 'mg', 'g'].includes(metric[2])) {
      amount *= {kg: 1, g: .001, mg: .000001}[metric[2]]
      unit = 'el kg'
    } else {
      amount *= {l: 1, ml: .001, cl: .01}[metric[2]]
      unit = 'el litro'
    }
  } else if (count) { amount = Number(count[1]); unit = 'c/u' }
  return amount > 0 && variant?.priceInCents != null ? `${money(Math.round(variant.priceInCents / amount), product.currency)} ${unit}` : ''
}
function purchaseRoots(id) { return $$('[data-purchase]').filter(el => el.dataset.purchase === String(id)) }

export function renderPurchase(id) {
  const product = products.get(String(id)), state = purchases.get(String(id))
  if (!product || !state?.variant) return
  const variant = state.variant
  const stockLeft = variant.stock == null ? Infinity : Math.max(0, variant.stock - variantQuantity(variant.id))
  state.quantity = Math.max(1, Math.min(state.quantity, stockLeft || 1))
  const label = presentation(product, variant)
  const units = product.metadata?.mostrador?.variants?.[String(variant.id)]?.units
  purchaseRoots(id).forEach(root => {
    $$('[data-price]', root).forEach(el => { el.textContent = money(variant.priceInCents, product.currency) })
    $$('[data-unit]', root).forEach(el => { el.textContent = [unitPrice(product, variant), units].filter(Boolean).join(' · ') })
    $$('[data-pres]', root).forEach(el => { el.textContent = label })
    $$('[data-sku]', root).forEach(el => { el.textContent = variant.sku ?? '' })
    $$('[data-purchase-qty]', root).forEach(el => { el.textContent = state.quantity })
    $$('[data-step="-1"]', root).forEach(el => { el.disabled = state.quantity <= 1 })
    $$('[data-step="1"]', root).forEach(el => { el.disabled = state.quantity >= stockLeft })
    $$('[data-option-name]', root).forEach(control => {
      const name = control.dataset.optionName
      const chosen = variant.selectedOptions.find(option => option.name === name)?.value
      if (control.tagName === 'SELECT') control.value = chosen ?? ''
      else {
        const active = chosen === control.dataset.optionValue
        control.classList.toggle('is-on', active); control.setAttribute('aria-pressed', String(active))
        const matching = product.variants.filter(v => v.selectedOptions.some(option => option.name === name && option.value === control.dataset.optionValue))
        control.disabled = !matching.length
        control.classList.toggle('is-unavailable', matching.length > 0 && matching.every(v => !v.available))
      }
    })
    $$('[data-compare]', root).forEach(el => {
      el.hidden = variant.compareAtPriceInCents == null || variant.compareAtPriceInCents <= variant.priceInCents
      el.textContent = money(variant.compareAtPriceInCents, product.currency)
    })
    $$('[data-stock]', root).forEach(el => {
      el.classList.toggle('is-low', variant.stock != null && variant.stock > 0 && variant.stock <= 5)
      el.classList.toggle('is-out', !variant.available)
      el.textContent = !variant.available ? 'Sin stock' : variant.stock != null && variant.stock <= 5 ? `Últimas ${variant.stock} unidades` : 'En stock'
    })
    $$('[data-pdp-add]', root).forEach(el => {
      el.disabled = !variant.available || variant.priceInCents == null || stockLeft <= 0
      el.setAttribute('aria-label', `Agregar ${state.quantity} ${product.title}`)
    })
    const image = $('[data-choose-image]', root)
    if (image) { image.src = variant.image?.url ?? product.coverImage?.url ?? ''; image.alt = product.title }
  })
  const pdp = $('[data-product-page]')
  if (pdp?.dataset.productPage === String(id)) {
    $$('[data-spec-presentation]', pdp).forEach(el => { el.textContent = label })
    if (units) $$('[data-spec-units]', pdp).forEach(el => { el.textContent = units })
    if (variant.image?.url) showImage(variant.image.url)
  }
}

function selectOption(id, name, value) {
  const product = products.get(String(id)), state = purchases.get(String(id))
  const candidates = product.variants.filter(v => v.selectedOptions.some(option => option.name === name && option.value === value))
  const score = variant => variant.selectedOptions.reduce((sum, option) => sum + (state.variant.selectedOptions.some(old => old.name === option.name && old.value === option.value) ? 1 : 0), 0)
  candidates.sort((a, b) => score(b) - score(a) || Number(b.available) - Number(a.available))
  if (!candidates.length) return
  state.variant = candidates[0]; state.quantity = 1
  renderPurchase(id)
}

function showImage(url) {
  const images = $$('[data-gallery-image]')
  if (!images.some(image => image.dataset.galleryImage === url)) return
  images.forEach(image => image.classList.toggle('is-on', image.dataset.galleryImage === url))
  $$('[data-thumb]').forEach(button => {
    const active = button.dataset.thumb === url
    button.classList.toggle('is-on', active); button.setAttribute('aria-pressed', String(active))
  })
}
function openProduct(id, trigger) {
  const product = products.get(String(id)), state = purchases.get(String(id))
  if (!product || !state) return
  $('#choose-title').textContent = product.options[0]?.name === 'Sabor' ? 'Elegí el sabor' : 'Elegí la presentación'
  const optionHTML = product.options.map(option => `<fieldset class="product-option"><legend class="opt-label">${escapeHTML(option.name)}</legend><div class="opt-chips">${option.values.map(value => `<button class="opt-chip" type="button" data-option-name="${escapeHTML(option.name)}" data-option-value="${escapeHTML(value.value)}" aria-pressed="false"><b>${escapeHTML(value.value)}</b></button>`).join('')}</div></fieldset>`).join('')
  $('[data-choose-content]').innerHTML = `<div data-purchase="${escapeHTML(id)}"><div class="choose-head"><figure class="media" style="--ar:1 / 1"><img data-choose-image alt=""></figure><div><b>${escapeHTML(product.title)}</b><span class="card-pres" data-pres></span><p class="price"><strong data-price></strong></p><p class="unit" data-unit></p></div></div>${optionHTML}<p class="stock" data-stock></p><div class="choose-actions"><div class="stepper" role="group" aria-label="Cantidad"><button type="button" data-step="-1" aria-label="Quitar uno">−</button><output data-purchase-qty aria-live="polite">1</output><button type="button" data-step="1" aria-label="Sumar uno">+</button></div><button class="btn btn-primary" type="button" data-pdp-add>Agregar</button></div><p class="choose-foot"><a class="link" href="${escapeHTML(product.url)}">Ver el producto completo</a></p><p class="purchase-status small" data-purchase-status role="status"></p></div>`
  renderPurchase(id)
  openSheet('elegir', trigger)
}

export function initProducts() {
  document.addEventListener('click', event => {
    const trigger = event.target.closest('button, a')
    if (!trigger || trigger.disabled) return
    if (trigger.matches('[data-choose-product]')) { openProduct(trigger.dataset.chooseProduct, trigger); return }
    if (trigger.matches('[data-thumb]')) { showImage(trigger.dataset.thumb); return }
    const root = trigger.closest('[data-purchase]')
    if (!root) return
    if (trigger.matches('[data-option-name]')) selectOption(root.dataset.purchase, trigger.dataset.optionName, trigger.dataset.optionValue)
    else if (trigger.matches('[data-step]')) {
      const state = purchases.get(root.dataset.purchase)
      state.quantity = Math.max(1, state.quantity + Number(trigger.dataset.step))
      renderPurchase(root.dataset.purchase)
    }
  })
  document.addEventListener('change', event => {
    const control = event.target
    if (control.matches('select[data-option-name]')) selectOption(control.closest('[data-purchase]').dataset.purchase, control.dataset.optionName, control.value)
  })
  const pdp = $('[data-product-page]')
  if (pdp) {
    const product = products.get(pdp.dataset.productPage), variant = purchases.get(pdp.dataset.productPage)?.variant
    if (product && variant) client.track('view_item', { product: { title: product.title, currency: product.currency, basePriceInCents: product.priceMinInCents }, variant: { id: variant.id, priceInCents: variant.priceInCents } }).catch(() => {})
  }
}
