import { $, $$ } from '@mostrador/dom'
import { client } from '@mostrador/client'

export function initForms() {
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
}
