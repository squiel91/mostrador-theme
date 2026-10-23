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

## Category hierarchy

Creating a collection with a non-null parentId and updating a collection's parent
both return HTTP 500. Current demo categories are valid independent records,
with products assigned to both the intended parent and child. Theme grouping
preserves the intended presentation and is marked `category-hierarchy`.

The older migration defining `check_category_cycles()` queries `categories`,
while current services use `collections`; this is a suspected source of the
failure, not a confirmed database diagnosis. No migration or platform patch
was applied during theme work.

When native children exist, navigation uses the real `children` data and removes
the hierarchy fallback marker automatically.

## Delivery, locations and promotions

Public Store data does not expose the general scheduling, location hours and
campaign-expiration contracts needed to implement those reference interactions.
The demo's shipping copy, countdown placeholder, hours and opening badges stay
visible under scoped red markers.

Cart quantities and subtotal are real. The remaining-to-free-shipping arithmetic
is implemented from the actual cart with a demo threshold of UYU 2,500. Its
eligibility/threshold source is still marked because checkout's destination-aware
rules are authoritative and the reference itself has different regional limits.

Unit prices are complete: package labels in Presentación are normalized to kg,
liters or individual units. Offers are complete: the `ofertas` collection owns
the product selection and the theme uses current API prices and compare-at prices.

## Shoppable recipes and editorial fields

The public BlogPost schema and Merchant API do not expose structured product
references, recipe facts or categories. The reference sidebar and recipe facts
are reproduced using a temporary theme mapping and marked in red. Recipe add
actions are disabled until that relationship and variant-choice contract is
agreed. Ordinary product cards elsewhere remain functional.
