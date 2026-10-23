# Mostrador

Tiendu-hosted theme: Liquid route folders, GraphQL data files, plain CSS and JS.
There is no build step. `minimal` is the functional reference; preserve the visual
structure, CSS and density of `../mostrador-design-reference`.

- Keep the released `assets/tiendu-sdk.js` unchanged.
- `assets/theme.css` holds design tokens and base styles. Feature styles live in
  `assets/css/`: icons, components, layout, dialogs, home, catalog, product, pages,
  blog and utilities. Keep responsive rules and states with their component.
- The root layout loads every stylesheet directly through `asset_url` and
  `stylesheet_tag`, in the `css_modules` order after `theme.css`. Preserve this
  cascade order; do not add CSS `@import` chains or a build step. Shared features
  (product cards, blog previews, dialogs) appear on multiple route types.
- Use resource `url` fields and `config/routes.json` for storefront navigation.
- `assets/theme.js` initializes feature modules in `assets/js/`. Cart mutations
  live in `cart.js`, variant selection in `products.js`, and shared shopping state
  in `state.js`; reconcile all purchase surfaces with the server cart.
- Use named `@mostrador/...` imports. Register new modules in the `js_modules` list
  in `routes/+layout.liquid`; it generates the import map and module preloads with
  `asset_url`. Keep the map before `tiendu_head` and every module script.
- `client.js` imports the released SDK through `@tiendu/sdk` and creates one client.
  Avoid duplicate clients, import cycles, unversioned relative URLs and re-export
  index modules; import each feature directly.
- Unit prices normalize Presentación values (kg/g, L/ml, x units) in Liquid and JS.
- Offers come from the `ofertas` collection.
- Mark deferred features with exactly `challenge-differed` and a `data-challenge`
  identifier. Its `::after` covers the element in red at 25% opacity and never
  intercepts pointer events. Keep markers scoped to unfinished features.
- Category relationships come from the API; use `products(includeDescendants: true)`
  and its `totalCount` for branch listings and counts. Products belong to child
  categories, with independent membership in Ofertas when applicable.
- Customize all fixed shipping costs/thresholds, delivery cutoffs/slots, store
  addresses/hours/status, cold-chain copy, pickup times and promotion terms in
  `lib/constants.liquid`. Read its keys with `{% render 'lib/constants', key: '...' %}`;
  money is in cents and `format: 'money'` formats it. Do not duplicate values in
  views or JavaScript. Cart progress reads the rendered threshold/region attributes.
- These values are intentionally hardcoded; keep their surfaces free of red
  markers. They control storefront messaging; checkout methods are Tiendu settings.
- Blog metadata is populated. Follow `docs/blog-metadata.md`: `category`, optional
  `recipe` facts and ordered `products` with native `product` picker references
  (`__type__: "product"`, `id`), `variantId`, whole-package `quantity` and `note`. The editing form is `--detailed-blog-post-metadata`.
- Picker markers now survive API round trips. Resolve `item.product.id` through
  a named `product(id:)` query in the view/layout, then pass the result to snippets;
  handle null resources and the eight distinct named-query limit.
- Deferred: connect that metadata to shoppable recipes, recipe details and blog
  categories in the theme; keep their red markers until the integration works.
- Keep shopper state out of server-rendered HTML. Use the Store SDK for sessions,
  cart, checkout, search, account and favorites.
- Validate with Tiendu's static checker and renderer, and check desktop/390px
  layouts and shopping interactions. Push only to a preview branch. Publishing
  `live` requires the user's explicit request.
- `seed/seed.json` and `seed/images/` preserve the complete theme demo data and
  original SVGs independently of the local store. This is a portable archive for
  future adapter work, not a native Tiendu importer. Follow `seed/README.md` for
  key/ID remapping and validate offline with `python3 seed/validate.py`.
- Keep images relative to `seed/`, references portable, and credentials/runtime
  receipts out of this archive. Preserve product attribute assignments, variants,
  collection hierarchy/order and blog metadata when updating it.
- `demo/` contains local import and verification tooling, not deployed theme files.
  It and `ANALYSIS.md` are excluded from Git.
