# Mostrador

Tiendu-hosted theme: Liquid route folders, GraphQL data files, plain CSS and JS.
There is no build step. `minimal` is the functional reference; preserve the visual
structure, CSS and density of `../mostrador-design-reference`.

- Keep the released `assets/tiendu-sdk.js` unchanged.
- Use resource `url` fields and `config/routes.json` for storefront navigation.
- Shared cart state and variant selection live in `assets/theme.js`; reconcile
  all purchase surfaces with the server's cart, including business errors.
- Unit prices normalize Presentación values (kg/g, L/ml, x units) in Liquid and JS.
- Offers come from the `ofertas` collection.
- Mark deferred features with exactly `challenge-differed` and a `data-challenge`
  identifier. Its `::after` covers the element in red at 25% opacity and never
  intercepts pointer events. Keep markers scoped to unfinished features.
- Deferred: category hierarchy fallback, delivery countdown and eligibility,
  destination-aware shipping progress, store hours/status and shoppable recipes.
- Keep shopper state out of server-rendered HTML. Use the Store SDK for sessions,
  cart, checkout, search, account and favorites.
- Validate with Tiendu's static checker and renderer, and check desktop/390px
  layouts and shopping interactions. Push only to a preview branch. Publishing
  `live` requires the user's explicit request.
- `demo/` contains local seed and verification tooling, not deployed theme files.
  It and `ANALYSIS.md` are excluded from Git.
