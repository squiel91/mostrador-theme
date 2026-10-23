# Deferred features and platform follow-ups

The red overlay class is exactly `challenge-differed`; it is defined in
`assets/theme.css`. Markers cover only the deferred component, and remain
click-through so neighboring completed interactions can be reviewed.

## Initial theme provisioning blocks Git previews

`git ls-remote http://localhost:4500/ni-muuu2.git` returns HTTP 503 with
“Theme repository is provisioning” and `Retry-After: 10`.

The server checks `stores.themeAppliedSha` before allowing Git operations.
The local store has no applied theme commit. Initial provisioning needs to be
completed by Tiendu before pushing the `mostrador` preview branch. The theme is
available locally using the actual Tiendu renderer at port 4174 meanwhile.

Public Store API resource `url` fields are also null until route configuration
is established by the store's theme. The documented Merchant API path fields
cannot currently be set: attempting a PATCH with the route patterns returns
HTTP 400, `Las URLs de esta tienda las define su tema, en config/routes.json.`
Mostrador's configuration already contains the correct patterns, and its rendered
links work. Search falls back to the rendered `/busqueda` route until the public
API has product URLs for native search-result links.

## Resolved: category hierarchy

Collection parent updates now succeed. All 15 children are nested under
Congelados, Almacén or Bebidas. Navigation, subcategory chips and breadcrumbs use
native relationships; the hardcoded child lists and category overlay were removed.

Products are assigned to child categories, plus Ofertas where appropriate.
Redundant direct assignments to the three parents were removed. Category pages
and home collection rails use `products(includeDescendants: true)`; navigation
and subcategory counts use the combined `totalCount`, because `productCount`
still counts direct assignments. Sorting, stock filtering, pagination and
deduplication run on the combined branch on the server.

## Resolved by fixed theme constants: shipping, delivery, stores and promotions

Customize all these values in `lib/constants.liquid`; see README.md for the keys,
units and surfaces. This file feeds fixed regional costs/eligibility/thresholds,
minimums, delivery cutoffs/slots, pickup times, location hours/status, cold-chain
copy and promotion terms. Shipping page policy content is rendered by the theme
from these constants, rather than duplicating saved page HTML values.

Cart quantity/subtotal remain real. Progress uses the configured Montevideo
threshold and region rendered into the DOM; no shopper address is inferred.
Shipping, delivery, store and promotion markers were removed by request. These
are storefront settings; checkout shipping methods are configured in Tiendu.

Unit prices and Ofertas category membership are complete.

## Blog metadata saved; theme integration pending

BlogPost metadata is now available and populated for all three articles. The
Merchant Center form (`--detailed-blog-post-metadata`) edits `category`, optional
`recipe` facts and ordered `products` with native product pickers, variant IDs,
whole-package quantities and notes. Merchant and Store API list/detail reads were verified;
all six references resolve to matching product variants, and the actual metadata
editor validator accepts the schema and values. Article bodies/publication fields
were preserved. See `docs/blog-metadata.md` for the complete contract.

The theme still uses its previous handle mappings/fixed facts and disabled recipe
buttons. Its red markers remain until queries, rendering, filtering and purchase
handlers consume the new metadata. Metadata filtering is not a Store API option;
load all needed article pages before computing category filters/counts.

The native picker key issue is resolved. All six references now preserve
`__type__: "product"` through both APIs, and the editing form uses product pickers
again. The documented named-query pattern was verified with the real renderer:
all six referenced products appear in initial HTML with no browser lookup. See
`docs/blog-metadata.md` for the pattern and the eight-call render limit.

Review the remaining integration:

- Shoppable recipes: http://localhost:4174/blog/milanesas-al-horno#recipe-products
- Recipe details: http://localhost:4174/blog/milanesas-al-horno#recipe-details
- Blog categories: http://localhost:4174/blog#post-filters
