import { $, $$, reducedMotion } from '@mostrador/dom'

let megaOpen = false
function toggleMega(force) {
  megaOpen = force ?? !megaOpen
  $('#mega')?.classList.toggle('is-open', megaOpen)
  $('[data-mega]')?.setAttribute('aria-expanded', String(megaOpen))
}

export function initUI() {
  $$('[data-root]').forEach(button => {
    const activate = () => {
      $$('[data-root]').forEach(root => root.classList.toggle('is-active', root === button))
      $$('[data-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === button.dataset.root))
    }
    button.addEventListener('mouseenter', activate); button.addEventListener('focus', activate); button.addEventListener('click', activate)
  })

  document.addEventListener('keydown', event => { if (event.key === 'Escape') toggleMega(false) })
  document.addEventListener('click', event => {
    if (!event.target.closest('.hd-nav')) toggleMega(false)
    const trigger = event.target.closest('button, a')
    if (!trigger || trigger.disabled) return
    if (trigger.matches('[data-mega]')) toggleMega()
    if (trigger.matches('[data-rail]')) {
      const rail = trigger.closest('.sec-head').nextElementSibling
      rail.scrollBy({ left: rail.clientWidth * .8 * Number(trigger.dataset.rail), behavior: reducedMotion ? 'instant' : 'smooth' })
    }
  })
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
  updateHeader()
}
