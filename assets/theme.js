// Versioned module aliases are declared in routes/+layout.liquid.
import { initDialogs } from '@mostrador/dialogs'
import { readProducts, initProducts } from '@mostrador/products'
import { initCart } from '@mostrador/cart'
import { initShopper } from '@mostrador/shopper'
import { initCatalog } from '@mostrador/catalog'
import { initForms } from '@mostrador/forms'
import { initUI } from '@mostrador/ui'

readProducts()
initDialogs()
initUI()
initProducts()
initCart()
initShopper()
initCatalog()
initForms()
