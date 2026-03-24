# UI Guidelines — frontend-hq-portal

This document defines the UI patterns and component choices for the HQ Portal frontend. All contributors (human and AI agents) must follow these guidelines to maintain consistency.

## Data Grid Selection

The portal uses **two data grid components**. Choose based on the use case:

### Simple Table (`@mantine/core` Table)

Use for **settings and configuration pages** where:
- The dataset is small (typically < 50 rows)
- The primary workflow is "scan list → click edit/delete"
- No sorting, filtering, or column resizing is needed
- The page is a CRUD management screen for a fixed set of records

**Current usage**: Payment Methods, Tax & Surcharge, Departments, Reasons, POS Users, Promotions, Discounts

**Pattern**:
```tsx
import { Table } from '@mantine/core';

<Table striped highlightOnHover>
  <Table.Thead>...</Table.Thead>
  <Table.Tbody>...</Table.Tbody>
</Table>
```

### DataTable (TanStack Table via `components/DataTable.tsx`)

Use for **data-heavy operational pages** where:
- The dataset can be large (100+ rows)
- Users need to sort, filter, search, or resize columns
- The workflow involves scanning and comparing many rows (spreadsheet-like)
- Pagination or virtual scrolling is required

**Current usage**: Menu Categories, Menu Items

**Pattern**:
```tsx
import { DataTable } from '../../../components/DataTable';

<DataTable
  data={items}
  columns={columns}
  loading={loading}
  enableSearch
  sorting={sorting}
  onSortingChange={setSorting}
/>
```

### Decision Rule

> If the page is a **settings/config** screen with a small, manageable list → use **Simple Table**.
> If the page is an **operational/data** screen where users work with large datasets → use **DataTable**.

### Consistency Rule

**Do not mix grid types within the same section** of the app. For example, all POS Settings pages should use the same grid type. If one page in a section needs an upgrade to DataTable, evaluate whether the entire section should upgrade.

## Component Library

- **UI Framework**: Mantine 8.x (`@mantine/core`)
- **Icons**: Tabler Icons (`@tabler/icons-react`)
- **Notifications**: Mantine Notifications (`@mantine/notifications`)
- **Charts**: Recharts
- **Drag & Drop**: dnd-kit

## Page Structure

All CRUD pages follow this structure:

1. **Container** with `size="xl" py="xl"` (the `py="xl"` provides spacing from the breadcrumb navbar)
2. **Header**: `Title` + action buttons (Refresh, New)
3. **Brand guard**: `Alert` when no brand selected
4. **Content**: Table or Tabs with tables
5. **Modals**: Create/Edit modal + Delete confirmation modal

## Form Patterns

- Use `useState` for form state (not form libraries)
- Validate before API calls, show `notifications` for errors
- Distinguish create vs edit by checking `editTarget !== null`
- Use `submitting` state to disable buttons during API calls
- Shop-level settings go in a sub-table inside the edit modal

## Notification Pattern

```tsx
// Success
notifications.show({ color: 'green', message: 'Item created' });
// Error
notifications.show({ color: 'red', message: 'Failed to save' });
// Warning
notifications.show({ color: 'yellow', message: 'Select a brand first' });
```

## Navigation

- Routes defined in three places: `routeConfig.ts` (breadcrumbs), `App.tsx` (routing), `Sidebar.tsx` (navigation)
- All three must be updated when adding a new page
- Sidebar sections group related pages; maintain consistency within sections
