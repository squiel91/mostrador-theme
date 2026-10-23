// Mostrador: all shopping surfaces share one session-backed cart and product state.
const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const money = (cents, currency = 'UYU') => cents == null ? 'A consultar' : new Intl.NumberFormat('es-UY', {
  style: 'currency', currency, minimumFractionDigits: currency === 'UYU' ? 0 : 2, maximumFractionDigits: currency === 'UYU' ? 0 : 2
}).format(cents / 100)
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const client = window.Tiendu({ search: { suggestions: ['Milanesas', 'Papas', 'Empanadas', 'Yerba'] } })
const products = new Map()
const purchases = new Map()
let cart = { quantity: 0, subtotal: 0, currency: 'UYU', lines: [] }
let cartQueue = Promise.resolve()
let statusTimer
const CART_FIELDS = 'quantity subtotal currency lines { id variantId quantity note isNoteVisible unitPrice subtotal product { id title url coverImage { url alt } } variant { stock available } }'

function notify(message) {
  const target = $('[data-global-status]')
  if (!target) return
  clearTimeout(statusTimer)
  target.textContent = message
  target.hidden = !message
  if (message) statusTimer = setTimeout(() => { target.hidden = true }, 6500)
}

function readProducts(root = document) {
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

const variantQuantity = id => cart.lines.filter(line => String(line.variantId) === String(id)).reduce((sum, line) => sum + line.quantity, 0)

function renderCart() {
  $$('[data-cart-count]').forEach(el => { el.textContent = cart.quantity })
  $$('[data-cart-total]').forEach(el => { el.textContent = money(cart.subtotal, cart.currency) })
  document.body.classList.toggle('has-cart', cart.quantity > 0)
  $$('[data-free-shipping-cents]').forEach(wrapper => {
    const threshold = Number(wrapper.dataset.freeShippingCents)
    const remaining = Math.max(0, threshold - cart.subtotal)
    $('[data-ship-msg]', wrapper).innerHTML = remaining
      ? `Te faltan <b>${escapeHTML(money(remaining, cart.currency))}</b> para el envío gratis en Montevideo`
      : '<b>Alcanzaste el mínimo de envío gratis</b> en Montevideo'
    $('[data-ship-bar]', wrapper).style.width = `${Math.min(100, cart.subtotal / threshold * 100)}%`
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
  cart = data.cart
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

function refreshCart() { return queueCart(readCart) }

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
  cart = result.cartLinesUpdate.cart
  renderCart()
  if (result.cartLinesUpdate.userErrors.length) notify(result.cartLinesUpdate.userErrors[0].message)
}

function purchaseRoots(id) { return $$('[data-purchase]').filter(el => el.dataset.purchase === String(id)) }

function renderPurchase(id) {
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

let dialogTrigger
function openSheet(id, trigger) {
  const dialog = document.getElementById(id)
  if (!(dialog instanceof HTMLDialogElement)) return
  closeSheets()
  dialogTrigger = trigger ?? document.activeElement
  dialog.showModal(); document.documentElement.style.overflow = 'hidden'
  trigger?.setAttribute('aria-expanded', 'true')
}
function closeSheets() {
  return Promise.all($$('dialog[open]').map(dialog => new Promise(resolve => {
    dialog.addEventListener('close', resolve, { once: true })
    dialog.close()
  })))
}
$$('dialog.sheet').forEach(dialog => {
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = ''
    dialogTrigger?.setAttribute('aria-expanded', 'false')
    if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true })
  })
})

function openProduct(id, trigger) {
  const product = products.get(String(id)), state = purchases.get(String(id))
  if (!product || !state) return
  $('#choose-title').textContent = product.options[0]?.name === 'Sabor' ? 'Elegí el sabor' : 'Elegí la presentación'
  const optionHTML = product.options.map(option => `<fieldset class="product-option"><legend class="opt-label">${escapeHTML(option.name)}</legend><div class="opt-chips">${option.values.map(value => `<button class="opt-chip" type="button" data-option-name="${escapeHTML(option.name)}" data-option-value="${escapeHTML(value.value)}" aria-pressed="false"><b>${escapeHTML(value.value)}</b></button>`).join('')}</div></fieldset>`).join('')
  $('[data-choose-content]').innerHTML = `<div data-purchase="${escapeHTML(id)}"><div class="choose-head"><figure class="media" style="--ar:1 / 1"><img data-choose-image alt=""></figure><div><b>${escapeHTML(product.title)}</b><span class="card-pres" data-pres></span><p class="price"><strong data-price></strong></p><p class="unit" data-unit></p></div></div>${optionHTML}<p class="stock" data-stock></p><div class="choose-actions"><div class="stepper" role="group" aria-label="Cantidad"><button type="button" data-step="-1" aria-label="Quitar uno">−</button><output data-purchase-qty aria-live="polite">1</output><button type="button" data-step="1" aria-label="Sumar uno">+</button></div><button class="btn btn-primary" type="button" data-pdp-add>Agregar</button></div><p class="choose-foot"><a class="link" href="${escapeHTML(product.url)}">Ver el producto completo</a></p><p class="purchase-status small" data-purchase-status role="status"></p></div>`
  renderPurchase(id)
  openSheet('elegir', trigger)
}

let megaOpen = false
function toggleMega(force) {
  megaOpen = force ?? !megaOpen
  $('#mega')?.classList.toggle('is-open', megaOpen)
  $('[data-mega]')?.setAttribute('aria-expanded', String(megaOpen))
}
$$('[data-root]').forEach(button => {
  const activate = () => {
    $$('[data-root]').forEach(root => root.classList.toggle('is-active', root === button))
    $$('[data-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === button.dataset.root))
  }
  button.addEventListener('mouseenter', activate); button.addEventListener('focus', activate); button.addEventListener('click', activate)
})

document.addEventListener('click', async event => {
  const trigger = event.target.closest('button, a, [data-close]')
  if (!trigger || trigger.disabled) return
  if (trigger.matches('[data-open]')) { openSheet(trigger.dataset.open, trigger); return }
  if (trigger.matches('[data-close]')) { closeSheets(); return }
  if (trigger.matches('[data-mega]')) { toggleMega(); return }
  if (!trigger.closest('.hd-nav')) toggleMega(false)
  if (trigger.matches('[data-choose-product]')) { openProduct(trigger.dataset.chooseProduct, trigger); return }
  if (trigger.matches('[data-thumb]')) { showImage(trigger.dataset.thumb); return }
  if (trigger.matches('[data-rail]')) {
    const rail = trigger.closest('.sec-head').nextElementSibling
    rail.scrollBy({ left: rail.clientWidth * .8 * Number(trigger.dataset.rail), behavior: reducedMotion ? 'instant' : 'smooth' }); return
  }
  if (trigger.matches('[data-qa-add], [data-qa-plus], [data-qa-minus]')) {
    const control = trigger.closest('[data-quick-add]')
    if (control.getAttribute('aria-busy') === 'true') return
    const adding = trigger.matches('[data-qa-add]')
    await queueCart(() => changeQuickQuantity(control, trigger.matches('[data-qa-minus]') ? -1 : 1), trigger)
    if (adding && control.classList.contains('is-active') && document.activeElement === trigger) $('[data-qa-plus]', control).focus({ preventScroll: true })
    return
  }
  const purchaseRoot = trigger.closest('[data-purchase]')
  if (purchaseRoot && trigger.matches('[data-option-name]')) { selectOption(purchaseRoot.dataset.purchase, trigger.dataset.optionName, trigger.dataset.optionValue); return }
  if (purchaseRoot && trigger.matches('[data-step]')) {
    const state = purchases.get(purchaseRoot.dataset.purchase)
    state.quantity = Math.max(1, state.quantity + Number(trigger.dataset.step)); renderPurchase(purchaseRoot.dataset.purchase); return
  }
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
  if (trigger.matches('[data-open-checkout], [data-open-account], [data-open-wishlist], [data-wishlist-product]')) {
    event.preventDefault(); await closeSheets()
    trigger.disabled = true
    try {
      if (trigger.matches('[data-open-checkout]')) { await cartQueue; await client.checkout.open() }
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
  if (control.matches('select[data-option-name]')) { selectOption(control.closest('[data-purchase]').dataset.purchase, control.dataset.optionName, control.value); return }
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

document.addEventListener('keydown', event => { if (event.key === 'Escape') toggleMega(false) })
document.addEventListener('click', event => { if (!event.target.closest('.hd-nav')) toggleMega(false) })

$$('[data-search]').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault()
  try {
    // Before a store's first theme is provisioned, the public API has no product
    // URLs for overlay results. The rendered search route already has theme URLs.
    const result = await client.query('{ products(first:1) { nodes { url } } }')
    if (!result.products.nodes[0]?.url) { form.submit(); return }
    await client.search.open({ query: form.elements.q.value.trim() })
  } catch { form.submit() }
}))

$$('[data-newsletter]').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault()
  const button = $('button[type="submit"]', form), status = $('[data-newsletter-status]', form)
  button.disabled = true; status.hidden = false; status.textContent = 'Enviando…'
  try {
    const result = await client.mutate('mutation($email:String!){subscriberCreate(email:$email){userErrors{code message}}}', { email: form.elements.email.value.trim() })
    if (result.subscriberCreate.userErrors.length) throw new Error(result.subscriberCreate.userErrors[0].message)
    status.textContent = '¡Gracias! Revisá tu correo para confirmar la suscripción.'; form.reset()
  } catch (error) { status.textContent = error.message }
  finally { button.disabled = false }
}))

let wishlist = new Set(), shopperRead = 0
function renderWishlist() {
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

const header = $('.site-header')
function updateHeader() {
  if (!header) return
  document.documentElement.style.setProperty('--hd-h', `${header.offsetHeight}px`)
  header.classList.toggle('is-stuck', scrollY > 40)
}
addEventListener('resize', updateHeader)
addEventListener('scroll', updateHeader, { passive: true })
if (header) new ResizeObserver(updateHeader).observe(header)
const announcements = $$('.announce-msg')
if (announcements.length > 1 && !reducedMotion) {
  let current = 0
  setInterval(() => { announcements[current].classList.remove('is-on'); current = (current + 1) % announcements.length; announcements[current].classList.add('is-on') }, 5000)
}
const mainAdd = $('.buy [data-pdp-add]')
if (mainAdd) {
  const updateBuybar = () => {
    const bottom = mainAdd.getBoundingClientRect().bottom
    document.body.classList.toggle('show-buybar', bottom <= (header?.getBoundingClientRect().bottom ?? 0))
  }
  // An observer alone misses a fast jump from below to above the viewport when
  // both observations are non-intersecting. Also check once per scroll frame.
  let buybarFrame = false
  addEventListener('scroll', () => {
    if (buybarFrame) return
    buybarFrame = true
    requestAnimationFrame(() => { buybarFrame = false; updateBuybar() })
  }, { passive: true })
  addEventListener('resize', updateBuybar)
  new IntersectionObserver(updateBuybar).observe(mainAdd)
}

window.addEventListener('tiendu:overlay-close', () => { refreshCart(); refreshShopper() })
window.addEventListener('tiendu:shopper-status', refreshShopper)
window.addEventListener('pageshow', refreshCart)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshCart() })
readProducts(); renderCart(); updateHeader(); refreshCart(); refreshShopper()
const pdp = $('[data-product-page]')
if (pdp) {
  const product = products.get(pdp.dataset.productPage), variant = purchases.get(pdp.dataset.productPage)?.variant
  if (product && variant) client.track('view_item', { product: { title: product.title, currency: product.currency, basePriceInCents: product.priceMinInCents }, variant: { id: variant.id, priceInCents: variant.priceInCents } }).catch(() => {})
}
