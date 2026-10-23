# Blog metadata

The three Frío Sur articles now have metadata saved through the Merchant API.
The Store API exposes the same values in blog list and detail queries when
`metadata` is selected. Theme integration is the next step; the current recipe
buttons and red blog markers are still present.

## Contract

```json
{
  "category": "recetas",
  "recipe": {
    "preparationMinutes": 25,
    "servings": 4,
    "ovenTemperatureCelsius": 220
  },
  "products": [
    {
      "product": {"__type__": "product", "id": 524},
      "variantId": "1166",
      "quantity": 1,
      "note": "Un paquete de 1 kg para cuatro personas."
    }
  ]
}
```

- `category`: `recetas` or `consejos`.
- `recipe`: optional facts; omit facts the article does not specify. Time is
  minutes and temperature is Celsius. Empanadas uses the article's oven method
  (25 minutes / 200 °C); its other methods remain in the article body.
- `products`: ordered references used for recipes or mentioned in advice posts.
  `product` is a native picker reference with `__type__: "product"` and a numeric
  `id`. `variantId` is a string ID belonging to that
  product, and `quantity` is a positive whole number of purchasable packages.
- `note`: ingredient usage or the chosen presentation/flavor. A recipe may use
  half a bag, while purchasing requires a whole bag. Do not store product prices,
  inventory, images or URLs here; resolve those from the current product data.

## Seeded articles

| Article | Category / facts | Products and default variants |
| --- | --- | --- |
| `milanesas-al-horno` | Recetas; 25 min, 4 portions, 220 °C | One 1 kg milanesas package (`1166`) and one 2.5 kg papas bag (`1168`); note that the recipe uses half the bag. |
| `cuanto-dura-cada-cosa-en-el-freezer` | Consejos; no recipe facts | One merluza package (`1173`), one 1 kg milanesas package (`1166`) and one 12-unit carne empanadas package (`1170`). |
| `empanadas-congeladas` | Recetas; 25 min, 200 °C; portions unspecified | One 12-unit carne empanadas package (`1170`). |

## Edit values

Merchant Center → this store → the blog article → **Esenciales → Editar metadatos**.
The form is provisioned under `--detailed-blog-post-metadata`. It exposes category,
optional recipe facts and an ordered list with native product pickers, variant
IDs, quantities and notes. Changing the form entry's schema does not change article values.

API updates replace the entire metadata value. Read first and preserve unrelated
keys. All values are public wherever the article is accessible. Blog queries
currently cannot filter or sort by metadata; category filtering must collect the
needed articles before filtering, rather than filtering one page and presenting
its counts as catalog-wide counts.

## Resolved: native picker references and server lookups

Tiendu fixed the nested JSON key transformation. All six product references now
round-trip through Merchant API PATCH/GET, Store API list/detail queries and the
actual metadata editor validator with their `__type__` marker intact. The blog
form uses native product pickers again; the temporary `productId` fields were
migrated without changing variant choices, quantities, notes or article content.

Resolve a picker while rendering by loading article `metadata` in the page data
file and calling a named query with each `item.product.id`:

```graphql
# queries/metadata-product.graphql (integration pattern)
query MetadataProduct($id: ID!) {
  product(id: $id) { id title url variants { id sku priceInCents available } }
}
```

```liquid
{% for item in data.post.metadata.products %}
  {% if item.product.__type__ == 'product' and item.product.id %}
    {% query 'metadata-product', id: item.product.id, as: 'resolved' %}
    {% if resolved.product %}
      {{ resolved.product.title | escape }}
    {% endif %}
  {% endif %}
{% endfor %}
```

The product is included in the initial HTML, with no browser lookup. Hidden or
deleted resources can return null. There are at most eight distinct named-query
calls per render; our articles need one, two or three. The documented pattern was
verified with the actual renderer and a read-only database connection for all
six references across all three articles, with zero static findings.

See [Resolve metadata references](http://localhost:4100/themes/data-files#resolve-metadata-references).
These examples describe the next theme integration; the production blog views
still use their earlier mapping and disabled recipe purchase actions.

## Local tooling

`demo/seed_blog_metadata.py` provisions the form and seeds these articles using
current product IDs and SKUs. It takes credentials externally, keeps a snapshot
before updating, preserves unrelated metadata/schema properties and checks that
article content and publication fields remain unchanged. Receipts are in the
ignored `demo/blog-metadata*.json` files. `demo/migrate_blog_product_pickers.py` migrates earlier plain IDs without
re-seeding article values. No blog query or purchase handler has been changed
during this metadata setup.
