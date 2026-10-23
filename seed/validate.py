"""Validate the portable backup offline. No dependencies, credentials or writes."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET


def check(condition, message):
    if not condition:
        raise ValueError(message)


def keyed(rows, label):
    result = {row['key']: row for row in rows}
    check(len(result) == len(rows), f'Duplicate {label} key')
    return result


def validate(root):
    data = json.loads((root / 'seed.json').read_text())
    check(data['format'] == 'mostrador-store-seed' and data['version'] == 1,
          'Unsupported archive format/version')
    groups = {name: keyed(data[name], name) for name in
              ['images', 'attributes', 'collections', 'products', 'pages', 'blogPosts', 'menus', 'metadata']}
    groups['attributeValues'] = keyed([v for a in data['attributes'] for v in a['values']], 'attribute value')
    groups['variants'] = keyed([v for p in data['products'] for v in p['variants']], 'variant')
    attribute_owner = {v['key']: a['key'] for a in data['attributes'] for v in a['values']}
    variant_owner = {v['key']: p['key'] for p in data['products'] for v in p['variants']}
    native_groups = {'image': 'images', 'product': 'products', 'collection': 'collections',
                     'page': 'pages', 'blogPost': 'blogPosts'}
    reference_fields = {'imageKey': 'images', 'coverImageKey': 'images', 'imageKeys': 'images',
        'emailLogoImageKey': 'images', 'storefrontUiAccountAccessImageKey': 'images',
        'parentKey': 'collections', 'collectionKeys': 'collections', 'productKeys': 'products',
        'attributeValueKeys': 'attributeValues', 'variantKey': 'variants'}

    def reference(group, key):
        check(key in groups[group], f'Missing {group} reference: {key}')

    def walk(value, schema=False):
        if isinstance(value, list):
            for item in value:
                walk(item, schema)
        elif isinstance(value, dict):
            kind = value.get('__type__')
            if kind in native_groups:
                reference(native_groups[kind], value['key'])
                check('id' not in value, 'Native metadata reference contains a source ID')
            for field, item in value.items():
                check(schema or field not in ['id', 'productId', 'variantId', 'resourceId', 'parentId',
                                    'imageId', 'imageIds', 'coverImageId', 'attributeValueIds', 'collectionIds'],
                      f'Archive contains store-specific field: {field}')
                if not schema and field in reference_fields and item is not None:
                    for key in item if isinstance(item, list) else [item]:
                        reference(reference_fields[field], key)
                if field == 'resourceKey':
                    reference(native_groups[value['resourceType']], item)
                if field == 'variants' and isinstance(item, dict):
                    for key in item:
                        reference('variants', key)
                walk(item, schema or field == 'jsonSchema')
        elif isinstance(value, str):
            check('localhost' not in value and '127.0.0.1' not in value,
                  'Archive still depends on a local service')
            check('td3_' not in value, 'Archive contains an API credential')

    walk(data)
    image_paths = set()
    for image in data['images']:
        path = (root / image['path']).resolve()
        check(path.is_relative_to((root / 'images').resolve()), 'Image path escapes images/')
        check(path not in image_paths, f'Duplicate image path: {path.name}')
        image_paths.add(path)
        check(hashlib.sha256(path.read_bytes()).hexdigest() == image['sha256'],
              f'Image checksum mismatch: {path.name}')
        check(ET.parse(path).getroot().tag == '{http://www.w3.org/2000/svg}svg',
              f'Invalid SVG: {path.name}')
        check(image['mimeType'] == 'image/svg+xml' and image['aspectRatio'] > 0, 'Invalid image metadata')
    check(image_paths == {p.resolve() for p in (root / 'images').iterdir() if p.is_file()},
          'Unlisted or missing image files')

    for c in data['collections']:
        branch, current = set(), c['key']
        while current is not None:
            check(current not in branch, f'Collection parent cycle: {current}')
            branch.add(current)
            current = groups['collections'][current]['parentKey']
        members = c['productKeys']
        check(len(members) == len(set(members)), f'Duplicate collection member: {c["key"]}')
        check(set(members) == {p['key'] for p in data['products'] if c['key'] in p['collectionKeys']},
              f'Collection/product assignments disagree: {c["key"]}')

    for p in data['products']:
        check(bool(p['variants']), f'Product has no variants: {p["key"]}')
        assigned = p['attributeValueKeys']
        check(len(assigned) == len(set(assigned)), f'Duplicate assigned attribute value: {p["key"]}')
        combinations = set()
        for v in p['variants']:
            values = v['attributeValueKeys']
            check(set(values).issubset(assigned), f'Unassigned variant attribute: {v["key"]}')
            owners = [attribute_owner[key] for key in values]
            check(len(owners) == len(set(owners)), f'Multiple values for one attribute: {v["key"]}')
            check(set(owners) == {attribute_owner[key] for key in assigned},
                  f'Incomplete variant options: {v["key"]}')
            combo = tuple(sorted(values))
            check(combo not in combinations, f'Duplicate variant combination: {v["key"]}')
            combinations.add(combo)
            for field in ['priceInCents', 'compareAtPriceInCents', 'weightInGrams', 'stock']:
                number = v[field]
                check(number is None or (type(number) is int and number >= 0),
                      f'Invalid {field}: {v["key"]}')
        facts = (p.get('metadata') or {}).get('mostrador', {}).get('variants', {})
        check(all(variant_owner[key] == p['key'] for key in facts), 'Presentation facts reference another product')

    recipe_references = 0
    for post in data['blogPosts']:
        metadata = post.get('metadata') or {}
        for item in metadata.get('products', []):
            check(variant_owner[item['variantKey']] == item['product']['key'],
                  f'Blog variant belongs to another product: {post["key"]}')
            check(type(item['quantity']) is int and item['quantity'] > 0, 'Invalid recipe quantity')
            recipe_references += 1

    return {**{name: len(rows) for name, rows in groups.items()},
            'reviews': sum(len(p['reviews']) for p in data['products']),
            'blogProductReferences': recipe_references}


if __name__ == '__main__':
    counts = validate(Path(__file__).resolve().parent)
    print('Valid portable Mostrador backup:', json.dumps(counts, ensure_ascii=False))
