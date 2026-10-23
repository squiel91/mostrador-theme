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
- Collection hierarchy presentation, stock filtering, sorting, numbered
  pagination and explicit load-more with progress.
- Native checkout, account and wishlist overlays; favorite buttons.
- Search overlay when public product URLs exist, with a working rendered search
  route while the store is awaiting its initial theme provisioning.
- Blog list, articles, help/policy pages, product reviews, related products and 404.
- Newsletter submission with API errors and confirmation feedback.
- Mobile dialogs with native focus management, Escape and focus restoration.
- Product purchase bar that appears after scrolling past the main action,
  including fast jumps down the page.

## Deferred features

Elements with the exact class `challenge-differed` have a red `::after` overlay:
absolute positioning, top/left zero, width/height 100%, opacity .25. It does not
intercept clicks. `data-challenge` identifies the item in the inspector.

| Marker | Deferred part |
| --- | --- |
| `category-hierarchy` | Native nested-category relationships; the local API currently returns HTTP 500. The intended grouping is used temporarily. |
| `delivery-countdown` | Delivery eligibility and cutoff countdown from authoritative scheduling data. |
| `opening-hours`, `opening-status` | Structured location schedules and current open/closed status. |
| `shipping-progress`, `shipping-policy`, `delivery-rules` | Authoritative thresholds, destination eligibility, costs and delivery scheduling. The displayed progress calculation already updates from the cart using the demo's Montevideo threshold. |
| `cold-chain-rules` | Product/destination-specific delivery restrictions. |
| `promotion-schedule` | Automatic campaign end times. Offers themselves use the real `ofertas` collection. |
| `shoppable-recipes`, `recipe-metadata`, `blog-categories` | Native post/product relationships and structured editorial fields. These retain the reference layout, with recipe purchasing deferred. |

Deferred features are visible for review. They should be resolved and the
appropriate marker removed as the platform contracts are implemented.

## Files and routes

`routes/+layout.*` loads shared store/navigation data and renders the shell.
Each page has its own `+page.liquid` and `+page.graphql`. Shared components are
under `lib/`; assets are plain CSS/JS. `assets/tiendu-sdk.js` is the unmodified
released SDK.

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

Development seed sources, API resource receipts and local verification artifacts
live in ignored `demo/`; they are excluded from the theme repository.
