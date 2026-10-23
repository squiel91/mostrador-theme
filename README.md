# Mostrador

A Tiendu theme for dense catalogs and fast grocery shopping. The HTML structure,
tokens and component CSS follow `mostrador-design-reference`; routes, GraphQL,
metadata and shopping SDK integration follow the folder-based Tiendu framework.
There is no build step or frontend framework.

## Working features

- Responsive home campaigns, category tiles, offers, best sellers and product rails.
- Real product prices, sale badges, availability and low-stock states.
- Quick add and quantity changes synchronized across repeated product cards,
  the header, desktop mini cart and mobile order summary.
- Persistent session cart; authoritative quantities and UYU totals from Tiendu.
- Variant sheets and product-page options, inventory, SKU and gallery updates.
- Unit-price calculation from Presentación (kg/g/mg, L/ml/cl and x units),
  including updated prices when changing a variant.
- Native collection hierarchy with descendant product listings and counts,
  stock filtering, sorting, numbered
  pagination and explicit load-more with progress.
- Native checkout, account and wishlist overlays; favorite buttons.
- Search overlay when public product URLs exist, with a working rendered search
  route while the store is awaiting its initial theme provisioning.
- Blog list, articles, help/policy pages, product reviews, related products and 404.
- Newsletter submission with API errors and confirmation feedback.
- Mobile dialogs with native focus management, Escape and focus restoration.
- Product purchase bar that appears after scrolling past the main action,
  including fast jumps down the page.

## Customize fixed values

Edit [lib/constants.liquid](lib/constants.liquid) to customize shipping costs,
free-shipping thresholds, the delivery minimum, cutoff/slot copy, cold-chain
restrictions, store names/addresses/hours/opening badges, pickup times and
promotion terms. These are intentionally hardcoded and have no red markers.
The same file feeds the header, home, footer, product logistics, cart progress
and the Envíos y zonas template. Edit this file instead of repeating values in
templates or JavaScript. The shipping template owns this fixed policy layout;
other help pages continue to render their saved page content.

Money is in cents: `250000` means UYU 2,500. Current delivery costs/free thresholds
are Montevideo 150/2,500, Ciudad de la Costa 190/3,000 and Resto de Canelones
250/4,000 pesos. Interior uses DAC with a quoted cost and pantry products only.
The delivery minimum is 900 pesos. The cart progress uses the Montevideo region
and threshold, with the real cart subtotal; it does not infer a shopper's address.
Delivery cutoffs and opening badges are fixed copy. Promotions use “Hasta agotar
stock.” Checkout delivery methods/costs are configured separately in Tiendu;
editing these constants changes storefront content and progress calculations.

Use a constant in a view or snippet:

```liquid
{% render 'lib/constants', key: 'montevideo_free_shipping_cents', format: 'money' %}
```

Omit `format` for the raw value. Store branding, product prices and stock continue
to come from Tiendu data.

## Deferred features

Elements with the exact class `challenge-differed` have a red `::after` overlay:
absolute positioning, top/left zero, width/height 100%, opacity .25. It does not
intercept clicks. `data-challenge` identifies the item in the inspector.

| Marker | Deferred part |
| --- | --- |
| `shoppable-recipes` | Product, variant and quantity references are saved in article metadata; the theme still uses a temporary handle mapping and disabled purchase actions pending integration. See [Milanesas al horno](http://localhost:4174/blog/milanesas-al-horno#recipe-products), “Lo que usamos,” also [Empanadas](http://localhost:4174/blog/empanadas-congeladas#recipe-products). |
| `recipe-metadata` | Structured recipe facts are saved and editable; the theme still displays fixed values pending integration. See the 25 min / 4 porciones / 220 °C strip on [Milanesas al horno](http://localhost:4174/blog/milanesas-al-horno#recipe-details). |
| `blog-categories` | Recetas/Consejos categories are saved in metadata. The theme still infers labels from handles and filters loaded cards pending integration. See [Recetas y consejos](http://localhost:4174/blog#post-filters) and article labels. |

See [Blog metadata](docs/blog-metadata.md) for the populated values, editing form,
native product-picker/variant/quantity contract and server-side reference lookups. Edit an
article through **Esenciales → Editar metadatos** in the Merchant Center.

Deferred features are visible for review. They should be resolved and the
appropriate marker removed as the platform contracts are implemented.

## Files and routes

`routes/+layout.*` loads shared store/navigation data and renders the shell.
Each page has its own `+page.liquid` and `+page.graphql`. Shared components are
under `lib/`; assets are plain CSS/JS. `assets/tiendu-sdk.js` is the unmodified
released SDK.

### Stylesheets

Design tokens and resets remain in `assets/theme.css`. Feature styles live in
`assets/css/`, with responsive rules and interaction states beside their components:

| File | Owns |
| --- | --- |
| `icons.css` | SVG icon masks. |
| `components.css` | Buttons, controls, media, product cards and rails. |
| `layout.css` | Announcement, header/navigation, footer and cart bars. |
| `dialogs.css` | Sheets, category drawer, option picker and sort dialog. |
| `home.css` | Banners, category tiles, offers, benefits, stores and newsletter. |
| `catalog.css` | Collection layout, category filters, sorting and pagination. |
| `product.css` | Product detail, gallery, purchasing, reviews and mobile buy bar. |
| `pages.css` | Help/shipping pages, policy content and search form. |
| `blog.css` | Blog cards/list, article, recipe facts and recipe products. |
| `utilities.css` | Reduced motion, hidden/busy states, toast and deferred overlays. |

The root layout loads `theme.css`, then its ordered `css_modules` list with
`asset_url | stylesheet_tag`. All files are linked directly, so the browser can
fetch them in parallel with the theme version on each URL. There are no CSS
`@import` chains or build tools. All routes load the same ordered set because
cards, article previews and dialogs are reused across pages. Preserve that order
when adding styles, and edit the file that owns the component.

### JavaScript modules and import map

`assets/theme.js` is the small initialization entry point. Feature modules under
`assets/js/` import one another directly through `@mostrador/...` names. The root
layout's `js_modules` list generates their import map and module preload URLs with
`asset_url`, preserving the same theme version on every dependency. The import
map is before `tiendu_head` and all module scripts; preloads let the browser fetch
known dependencies in parallel. Add a new module name to that list when adding a
file. No build step, external import-map fetch or re-export index is needed.

| Module | Owns |
| --- | --- |
| `client.js` | One SDK client, imported from the versioned `@tiendu/sdk` mapping. |
| `state.js` | Shared product/purchase data and authoritative cart state. |
| `cart.js` | Serialized mutations, stock-error reconciliation, quantity controls, mini cart and shipping progress. |
| `products.js` | Variant selection, unit pricing, gallery, product sheets and product analytics. |
| `dialogs.js`, `ui.js` | Dialog focus/lifecycle, navigation, rails, announcements and sticky purchase UI. |
| `shopper.js` | Account, wishlist, checkout and shopper refreshes. |
| `catalog.js`, `forms.js` | Pagination/filtering, blog filtering, search and newsletter. |
| `dom.js` | DOM helpers, formatting and status messages. |

For example: `import { refreshCart } from '@mostrador/cart'`. Use the named map
entries rather than unversioned relative imports. Shared state and explicit
initializers keep the dependency graph acyclic and each listener registered once.

| Route | Purpose |
| --- | --- |
| `/` | Store home |
| `/categorias/[handle]` | Collections; `todas` is all products |
| `/productos/[handle]` | Product detail and purchasing |
| `/busqueda?q=...` | Search results |
| `/paginas/[handle]` | Help/policy content |
| `/blog`, `/blog/[handle]` | Articles |

`config/routes.json` defines resource URL patterns. Use API `url` fields for
links. Campaign artwork references the demo's Tiendu gallery; product/content
images come from queried resources. Store colors and font come from personalization.

## Local review

The current local review URL is `http://localhost:4174/`. The ignored `demo/`
folder contains a development harness using Tiendu's actual theme renderer and
a read-only database pool. Browser shopping actions use the real Store API.
Local store developer mode is enabled so localhost can use the SDK overlays.

Static validation reports zero findings. Browser checks passed for cart
synchronization/persistence, option selection, unit pricing, inventory, gallery,
stock filtering, sorting, pagination, overlays, deferred-marker styling, mobile
dialogs and sticky purchase controls. Search fallback and newsletter submission
were checked separately. Disposable carts/subscriptions were cleaned up; no
orders were placed.

The local branch is `mostrador`, targeting `http://localhost:4500/ni-muuu2.git`.
The Git service currently returns HTTP 503, “Theme repository is provisioning”,
so a hosted preview cannot be pushed yet. No live theme has been published.

## Portable demo archive

[seed/seed.json](seed/seed.json) and [seed/images/](seed/images/) preserve the
current Frío Sur demo independently of the local store: 48 products, 51 variants,
two attributes and product assignments, 19 collections and their hierarchy/order,
three blog posts with metadata, six pages, two menus, seven demo reviews, branding,
the blog metadata editing form and 66 original SVG files. Image paths are relative;
resource references use stable keys instead of source store IDs.

This is a backup for future Tiendu seed adaptation. It does not import data or
change the current store. See [seed/README.md](seed/README.md) for the conventions
and required key/ID translations. Validate without network access or credentials:

```bash
python3 seed/validate.py
```

Local import scripts, API resource receipts and verification artifacts remain in
ignored `demo/`; the portable `seed/` archive is included in the theme repository.
