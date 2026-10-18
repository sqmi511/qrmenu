# QR Menu: Design

## Data models (MongoDB)
`L` = localized `{ en, ar }`. Money is stored as integer minor units (550 = 5.50).

| Model | Fields |
|---|---|
| User (step 4) | email (unique), passwordHash, role (`admin` \| `staff`), restaurant → Restaurant |
| Restaurant | slug (unique), name L, description L, logoUrl, coverUrl, currency, defaultLang, tableCount, accentColor, isActive, owner → User (step 4) |
| Category | restaurant*, name L, order, isActive |
| Item | restaurant*, category*, name L, description L, priceMinor, imageUrl, tags[], isAvailable, order |
| Order (step 6) | restaurant*, tableNumber, lines[{item, nameSnapshot, priceMinorSnapshot, qty, note}], totalMinor, status (`pending → accepted → preparing → ready → served` \| `cancelled`), publicToken (random, unguessable), timestamps |

Rules:
- Every admin query is scoped to the restaurant the JWT user owns (step 5).
- The server recomputes order totals from DB prices and never trusts client prices.
- Customers track an order through `publicToken` only.

## API (`/api`)
| Method | Path | Auth | Step |
|---|---|---|---|
| GET | /health | - | done |
| GET | /public/restaurants/:slug/menu | public | 2 |
| POST | /public/restaurants/:slug/orders | public + rate limit | 6 |
| GET | /public/orders/:token | public | 6 |
| GET/POST | /restaurants | admin | 2 |
| GET/PATCH/DELETE | /restaurants/:id | admin | 2 |
| GET/POST | /restaurants/:restaurantId/categories | admin | 2 |
| PATCH | /restaurants/:restaurantId/categories/reorder | admin | 2 |
| PATCH/DELETE | /categories/:id | admin | 2 |
| GET/POST | /restaurants/:restaurantId/items | admin | 2 |
| PATCH | /restaurants/:restaurantId/items/reorder | admin | 2 |
| GET/PATCH/DELETE | /items/:id | admin | 2 |
| POST | /auth/register, /auth/login, /auth/logout; GET /auth/me | mixed | 4 |
| GET | /restaurants/:restaurantId/orders; PATCH /orders/:id/status | admin | 6 |
| POST | /uploads/image | admin | 8 |

## Pages
Customer:
- `/r/:slug?table=5`: menu, cart drawer, checkout
- `/r/:slug/order/:token`: live status timeline

Admin:
- `/admin/login`
- `/admin`: dashboard
- `/admin/orders`: live
- `/admin/menu`: categories and items, drag and drop
- `/admin/qr`: printable QR codes
- `/admin/settings`

## Design system
- **Palette:** brand `ember` (orange, 50-950 scale); neutral `stone`; semantic success (emerald), warning (amber), danger (red).
- **Light/dark:** light uses stone-50 background, white surface, stone-900 ink. Dark uses #0c0a09 background, stone-900 surface, stone-50 ink. All colors are CSS variables toggled by a `.dark` class.
- **Type:** Plus Jakarta Sans (Latin), Cairo (Arabic); fluid scale.
- **Shape/depth:** card radius 20px, input radius 12px, pills; soft layered shadows. Spacing on a 4px grid.
- **RTL:** logical utilities only (`ms-`, `ps-`, `start-`, `end-`); `dir` set on `<html>` from language.
- **Motion:**
  - Spring: stiffness 380, damping 30.
  - Durations: 150, 250, 400 ms.
  - Stagger: 40 ms.
  - Wrap the app in `MotionConfig reducedMotion="user"`.
- **Accessibility:** WCAG AA contrast, visible `:focus-visible` rings, 44px touch targets.

### Components
- **Primitives:** Button, IconButton, Input, SearchInput, Select, Switch, Chip/Badge, Card, Skeleton, Spinner, Toast, Modal, Drawer, Tabs (animated pill), QuantityStepper, LazyImage, EmptyState, ErrorState, ThemeToggle, LangToggle.
- **Customer:** CategoryNav (sticky), MenuItemCard, CartFab, CartDrawer, OrderTimeline.
- **Admin:** Sidebar layout, DataTable, StatCard, OrderCard, LiveOrderAlert, SortableList, ItemEditor.