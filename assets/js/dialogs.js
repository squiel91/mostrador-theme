import { $$ } from '@mostrador/dom'

let dialogTrigger
export function openSheet(id, trigger) {
  const dialog = document.getElementById(id)
  if (!(dialog instanceof HTMLDialogElement)) return
  closeSheets()
  dialogTrigger = trigger ?? document.activeElement
  dialog.showModal(); document.documentElement.style.overflow = 'hidden'
  trigger?.setAttribute('aria-expanded', 'true')
}
export function closeSheets() {
  return Promise.all($$('dialog[open]').map(dialog => new Promise(resolve => {
    dialog.addEventListener('close', resolve, { once: true })
    dialog.close()
  })))
}

export function initDialogs() {
  $$('dialog.sheet').forEach(dialog => {
    dialog.addEventListener('close', () => {
      document.documentElement.style.overflow = ''
      dialogTrigger?.setAttribute('aria-expanded', 'false')
      if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true })
    })
  })

  document.addEventListener('click', event => {
    const trigger = event.target.closest('button, a, [data-close]')
    if (!trigger || trigger.disabled) return
    if (trigger.matches('[data-open]')) openSheet(trigger.dataset.open, trigger)
    else if (trigger.matches('[data-close]')) closeSheets()
  })
}
