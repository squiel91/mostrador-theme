# Mostrador seed archive

This folder preserves the Frío Sur demo data independently of the local store.
It belongs in the theme repository. Deleting the local database or image service does
not remove these files. `seed.json` is an archive for future adaptation, not a
currently supported Tiendu import request. There is no importer or automatic
store update in this folder.

The snapshot was read from the current Merchant API, including current variant
stock and blog metadata, rather than rebuilding from the initial demo fixtures.
All image bytes are included under `images/`. This is theme demo content, not a
backup of transactions, customers, credentials or platform configuration.

## Contents

- 48 products and all 51 variants, including prices in cents, compare-at prices,
  stock, SKUs, weights, visibility, specifications, SEO and presentation metadata.
- Two global attributes with five values, their swatch/image data, explicit
  product attribute-value assignments, and each variant's selected combination.
- 19 collections with parent relationships, cover images, metadata, SEO,
  visibility and ordered direct product assignments. Parents do not duplicate
  products assigned to their children. Ofertas is a separate membership.
- Three complete blog posts, including publication dates, covers, structured
  content, category/recipe metadata and all six product/variant/quantity references.
- Six help/policy pages, two menus and seven demo product reviews.
- The blog metadata editor form/schema, stored as a JSON object.
- Store branding, contact/pickup information, personalization and logo reference.
- 66 original SVGs with alt text, aspect ratios and SHA-256 checksums.
- `themeImages`: the six home banner slots and their image keys, for updating
  the theme's gallery URLs when these images are uploaded to a new store.

Fixed shipping rules, hours, cold-chain copy and promotion terms stay in
`../lib/constants.liquid`; they are already preserved as theme source. Checkout
shipping/payment methods and live platform integrations are configured separately.

## Reference conventions

The structure follows the stable-key idea in Tiendu's `store-seed.data.ts` and
`headless-minimal/seed/seed.json`, with the extra fields Mostrador requires.

Every record has a `key` that is unique within its resource type. Product,
collection, page and blog keys are their handles. Variant keys use
`product-handle/SKU`; attribute value keys use `attribute-key/value-slug`.
Array order preserves image, attribute-value, variant, content and menu ordering.

```json
{
  "key": "milanesas-pollo-1",
  "path": "images/milanesas-pollo-1.svg",
  "mimeType": "image/svg+xml",
  "alt": "Milanesas de pollo rebozadas · 1 kg",
  "aspectRatio": 1
}
```

Image paths are relative to this folder. `imageKeys`, `coverImageKey`,
`collectionKeys`, `parentKey` and `attributeValueKeys` name records in this file.
Collection `productKeys` is the complete ordered list of **direct** members.
Product `attributeValueKeys` is the set allowed for that product; the equivalent
field on a variant is its selected combination. Even products without options
have their one variant explicitly saved.

Menus use `resourceType` plus `resourceKey` for resource links; URL-only links
such as `/blog` retain `url`. Recreate resource URLs from the theme's
`../config/routes.json` and the recreated resource, rather than carrying over a
source store URL.

Blog metadata uses portable picker references and variant keys:

```json
{
  "product": {"__type__": "product", "key": "milanesas-de-pollo-rebozadas"},
  "variantKey": "milanesas-de-pollo-rebozadas/FS-1032",
  "quantity": 1,
  "note": "Un paquete de 1 kg para cuatro personas."
}
```

After resource creation, replace picker `key` with its new numeric `id`, and
`variantKey` with `variantId` containing the new ID as a string. Product
`metadata.mostrador.variants` is also keyed by stable variant keys here: translate
those dictionary keys to the new variant ID strings before saving metadata.
All other metadata is preserved. These translations are necessary; the archived
metadata is deliberately independent of the deleted store's IDs.

## Future adaptation order

1. Upload `images[].path` and map each image key to its new image ID/URL. SVGs use
   Tiendu's upload-intent flow; local paths are not public `sourceUrl` values.
2. Create attributes and map their values, then collections with their parents.
3. Create products and assign their allowed attribute values; recreate the saved
   variants and images. For option products, remove the initial no-option variant
   once the intended combinations exist. Keep the intended default variant on
   products without options.
4. Apply direct collection memberships and each collection's manual ordering.
5. Remap product presentation metadata; create pages/posts with remapped picker
   and variant references, then install the blog metadata form.
6. Create menus using the new resource IDs; apply the saved branding and logo.
   Refresh home banner URLs using `themeImages` and the uploaded image map.
7. Optionally recreate demo reviews. No real customer/order records are included.

Do not send `key` fields or portable `*Key` references verbatim to Merchant API.
The future adapter must translate them to its expected shape. Current APIs use
JSON-encoded text for the metadata form's `jsonSchema`; this archive keeps it as
an object for readability. Resource metadata is ordinary nested JSON.

## Offline verification

From the theme root, with Python 3.9 or later:

```bash
python3 seed/validate.py
```

The validator checks image checksums/SVGs, unique keys, cross-resource references,
collection cycles/order/membership, product/variant attribute assignments,
presentation facts and blog variant ownership/quantities. It also rejects local
service dependencies, original resource ID fields and Tiendu API credentials.
It makes no network requests and never writes to a store.
