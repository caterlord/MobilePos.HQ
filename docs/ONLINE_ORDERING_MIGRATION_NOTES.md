# X1 HQ Online Ordering Notes

## Scope
This document records the X1 HQ replacement choices for the legacy ODO workflows implemented in milestone `X1 HQ: Online Ordering`.

## CTA Management
Legacy HQ used hidden smart categories such as `Odo Cart Page (CallToAction)` and `Odo Order History Page (CallToAction)` to manage CTA content.

X1 replaces that pattern with a structured settings document stored through:

- `GET /api/online-ordering/brand/{brandId}/call-to-action`
- `PUT /api/online-ordering/brand/{brandId}/call-to-action`

Persistence model:

- table: `DbMasterTableTranslation`
- `DbTableName = "ONLINE_ORDERING"`
- `DbFieldName = "CALL_TO_ACTION"`
- `DbFieldId = 0`
- `LanguageCode = "json"`

This design removes the need for hidden-category seeding in production while still allowing CTA content to target an ODO smart category through `smartCategoryId`.

## UI i18n
Legacy HQ combined:

- GitLab-hosted base language JSON
- EW API-based override storage
- per-order-channel override behavior

X1 uses HQ-managed per-channel JSON documents exposed through:

- `GET /api/online-ordering/brand/{brandId}/ui-i18n`
- `PUT /api/online-ordering/brand/{brandId}/ui-i18n`

Persistence model:

- table: `DbMasterTableTranslation`
- `DbTableName = "ONLINE_ORDERING"`
- `DbFieldName = "UI_I18N"`
- `DbFieldId = <orderChannelId>`
- `LanguageCode = <languageCode>`

The X1 editor flattens nested JSON into key/value fields for operators and writes it back as structured JSON documents on save.

Initial intentional simplifications:

- no GitLab sync in X1 HQ
- no external EW API dependency in X1 HQ
- language coverage is driven by the stored ODO documents returned by the backend

## Menu Management
X1 keeps ODO menu management on top of the existing menu primitives instead of creating a second menu system.

Current responsibilities:

- smart category publication and ODO visibility remain on `SmartCategory`
- category item membership remains on `SmartCategoryItemDetail`
- shop-specific category visibility remains on `SmartCategoryShopDetail`
- channel-specific category visibility remains on `SmartCategoryOrderChannelMapping`
- item metadata remains on the existing menu item APIs and editor flows

This keeps the ODO module dedicated for operators while avoiding duplicate menu data models.
