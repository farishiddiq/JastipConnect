# JastipConnect

**Bawa rumah lebih dekat, lewat bagasi sesama diaspora.**

JastipConnect is a demo of a jastip marketplace (think eBay, Kaskus, Gumtree) for the Indonesian diaspora, with two corridors: Saudi Arabia ↔ Indonesia and Australia ↔ Indonesia. Each direction is its own listing. It's a mobile-first web app with two listing types:

- **Jastip Bagasi (primary, by weight):** a traveler posts a route, dates, spare baggage (kg), a fee per kg, and a last drop-off date. Clients request space with an estimated weight; the provider weighs the items at handover.
- **Jastip Barang (secondary, by item, formerly "Jastip Belanja"):** a personal shopper posts a pre-order catalog. Arrival date is required; everything else per product is optional. Items without a price show "Tanya harga".

The app is built with React, TypeScript, Vite, Tailwind CSS, and shadcn-style components (Radix primitives). It uses lucide-react icons, React Router, and sonner for toasts. The landing hero demo is built with the [stageshow](https://github.com/benjitaylor/skills) kit (copied to `src/stageshow/kit`, MIT).
**All data lives in the browser's `localStorage`. There is no backend.** Magic-link email, WhatsApp OTP, notifications, holds and payments are simulated.

---

## Running the app

Requires Node.js 18 or newer.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check (tsc -b) + production build in dist/
npm run preview   # serve the dist/ build
```

> When deploying the build to static hosting, set up an SPA fallback (all routes → `index.html`) so that deep links like `/listings/l-w1` work.

---

## Day 0 feature set (22 features, all free)

| Clients (9) | Providers (10) | Both (3) |
|---|---|---|
| Browse and search listings | Sign-up (WhatsApp OTP) before posting | Log in / log out (magic link) |
| Live kg left on each listing | Post a trip or pre-order | Profile and account settings |
| Structured request form | Shareable WhatsApp link + PNG trip card | Terms and privacy at sign-up |
| Sign-up at first request (form first, magic link on submit) | Live quota with expiring holds | |
| Order tracking page (`/orders/:id`) | Request inbox: accept or decline (`/orders`) | |
| Amount due and payment-proof upload | Order sheet per trip, unlimited, CSV export | |
| Notifications on every update | Handover record: weight and photo | |
| Star rating after delivery | Payment tracker (records only) | |
| Report a listing or user | One-tap shipped and delivered; ratings and reports | |

One account has two modes, **Klien** and **Provider**, switched from the header. Provider mode has its own dark navy header with a PROVIDER label and lands on `/dashboard`; client mode keeps the light marketplace header and shows active orders on the home page. Provider mode needs a verified WhatsApp number and the provider terms. Inbox and order lists follow the active mode.

## 5-minute demo flow

1. Open `/listings/l-d2` (Sydney → Jakarta) while signed out. Click **Request titipan**, fill in the weight and items, then **Lanjut kirim request**. Sign up with any email: click **Buka link masuk** in the simulated inbox, enter a name and accept the terms. You land on the order's tracking page; the kg is held for 24 hours.
2. Footer → **Akun demo** → **Ahmad Fauzi**. You land on his provider dashboard. Under **Perlu tindakan**: answer Budi's request, check Aisyah's payment proof (**Tandai lunas**), then mark Yusuf's order **Dikirim**.
3. **Trip saya** → **Order sheet** on "Bagasi kosong 20 kg" lists every order on the trip, with totals and CSV export. **Bagikan** makes the WhatsApp text and the PNG trip card.
4. Switch to **Aisyah**: the home page opens with her active orders. Open the Sydney order (Sampai) → **Sudah diterima** → rate Dewi.
5. Switch to **Andi Wijaya** (free plan, 1 active pre-order): publishing his draft trip is blocked until he buys a **Slot listing** or Pro.
6. `/harga` shows every plan. Switch to **Admin Demo** → `/admin`: reports, ticket verification (Siti's Makassar trip is waiting), partnership leads, simulated revenue (Rp922.000 this month).
7. `/profile` → **Reset Data Demo** restores the seed.

### Demo accounts (switcher in the footer, no password)

Roles never overlap: providers only post trips, clients only order. The data covers one month: the last 30 days of orders plus trips departing in the next 6 weeks. Every order's dates agree with its trip (handover before drop-off, shipped after departure) and no trip is overbooked.

**Providers (5)**, all WhatsApp-verified:

| Account | Listings | Plan |
|---|---|---|
| Ahmad Fauzi · Riyadh | Bagasi RUH→CGK (done), RUH→CGK (+12 days, boosted), CGK→RUH (+40 days, ticket rejected) | Pro (renewed) |
| Nadia Rahma · Jeddah | Jastip Barang: kurma & cokelat (boosted), fashion & attar (done), oleh-oleh umrah | Pro + Promoted |
| Siti Maryam · Madinah | Bagasi MED→CGK (in transit), MED→UPG (+6 days, ticket pending) | Block of 5 slots |
| Dewi Lestari · Sydney | Bagasi SYD→CGK (done), SYD→CGK (+20 days), CGK→SYD (+45 days, paid slot) | Promoted + 1 slot |
| Andi Wijaya · Melbourne | Jastip Barang: produk Australia; one draft trip | Free, at its limit |

**Clients (10):** Aisyah Putri (Jakarta, most active), Budi Santoso (Bandung), Rizky Pratama (Surabaya), Fatimah Zahra (Riyadh), Hendra Gunawan (Sydney), Maya Sari (Makassar), Yusuf Hakim (Medan), Lestari Wulandari (Yogyakarta), Rahmat Hidayat (Semarang, new), Nurul Huda (Perth).

**Moderator:** Admin Demo (`/admin`).

Totals: 37 orders in every stage (7 pending with live holds, 7 accepted, 4 handed over, 1 shipped, 2 delivered, 10 completed, 2 declined, 2 cancelled, 2 expired), 10 ratings, 3 reports, 2 partnership leads, 10 plan purchases. Each account has an `@demo.jastip.id` email for the magic-link login (for example `aisyah@demo.jastip.id`).

---

## Routes

| Route | Page | Access |
|---|---|---|
| `/` | Landing: diaspora hero with stageshow demo, Bagasi-first tiles, Jastiper Pilihan (promoted), how it works, trust | Public |
| `/explore` | Search + filters (synced to the URL query string). Boosted trips and promoted providers sort first among open listings | Public |
| `/listings/:id` | Listing detail. Guests can open the request form | Public |
| `/providers/:id` | Public profile, trust score, ratings | Public |
| `/dashboard` | Provider home: KPIs, "Perlu tindakan" queue, active trips, reputation, plan. `/` redirects here in provider mode | Provider |
| `/orders` | Client: my orders. Provider: request inbox | Member |
| `/orders/:id` | Order tracking: timeline, handover, bill, payment proof, actions | Order participant |
| `/post` | Pick a type → wizard (free-plan limit banner) | Provider |
| `/listings/:id/edit` | Edit / continue a draft | Owner |
| `/my-listings` | Trip saya: tabs, share, ticket verification, boost, plan panel | Provider |
| `/my-listings/:id/orders` | Order sheet per trip (unlimited, CSV) | Provider (owner) |
| `/inbox`, `/inbox/:conversationId` | Chat per order, filtered by mode | Participant |
| `/harga` | Pricing, simulated checkout, brand-partnership form | Public |
| `/syarat`, `/privasi` | Terms and privacy (draft, needs legal review) | Public |
| `/saved`, `/profile` | Saved listings; profile, mode, provider plan and purchase history | Member |
| `/admin` | Reports, ticket proofs, leads, revenue | Admin Demo |
| `/safety` | Prohibited items, rules, demo limitations | Public |

---

## Business rules

- **Order lifecycle:** `pending` → `accepted` → `handed_over` → `shipped` → `delivered` → `completed`, or `declined` / `cancelled` / `expired`. Every transition posts a system message in the chat and a notification to the other side.
- **Holds:** a pending request holds its kg (or stock) for 24 hours; unanswered, it expires. An accepted Bagasi request holds until the drop-off deadline; not handed over by then, it expires. `sweepExpiredHolds()` runs on load and every minute.
- **Quota:** remaining kg = capacity − kg of pending (live hold) and accepted-or-later orders. After handover the weighed kg replaces the estimate. Accept and handover re-check against the latest data.
- **Handover** needs a photo (and weight for Bagasi) and sets the amount due. **Payment** is records only: the client uploads proof, the provider marks it paid. Shipping before paid is allowed with a warning.
- **Completion:** the provider marks delivered, the client confirms receipt. Only completed orders can be rated, once, 1 to 5 stars.
- **Cancellation:** the client can cancel before handover.
- **Free plan:** 1 active (open or full) trip at a time. Pro removes the limit. Extra trips use slot credits (Rp50.000 each, or 5 for Rp200.000); a listing that used a credit keeps it (`paidSlot`). Orders are never capped.
- **Plans (simulated):** Featured trip Rp25.000 / 7 days, Slot Rp50.000, Block 5 Rp200.000, Pro Rp99.000 / 30 days, Promoted Rp150.000 / 30 days, Brand partnership by negotiation (lead form). Buying an active plan again extends it.
- **Anti-scam:** WhatsApp OTP before posting; per-trip ticket proof reviewed by a moderator for the "Trip terverifikasi" badge; trust score (0 to 100) from WhatsApp, ratings, completed orders, verified trips, account age, minus reports; reports on listings and users.
- **Admin:** closes reported listings, approves or rejects ticket proofs, tracks leads and simulated revenue.

---

## localStorage contract

Versioned namespace `jc:v1:`, with `settings.schemaVersion` (currently 5). v4 replaced the demo dataset (separate roles, one month of activity), so data from an older version is cleared and re-seeded once on load, with a toast. Within v4, reloading never overwrites what you create.

`jc:v1:users`, `session` (includes `mode`), `listings`, `inquiries` (orders), `conversations`, `messages`, `reviews`, `reports`, `notifications`, `purchases`, `leads`, `settings`.

- **Seeds only on the first visit.** Reloading never overwrites data you created.
- Reads use a safe JSON parse with shape validation and fall back to defaults. Writes catch the quota-exceeded error and show a toast. If `localStorage` isn't available, the app runs in memory and shows a warning.
- Multi-collection changes are written in one transaction and rolled back if a write fails.
- Changes in other tabs sync through the `storage` event.

---

## What's simulated (and what isn't)

- **Login:** magic-link email is shown in a simulated inbox. The demo account switcher stays in the footer. Access checks run in the app only and are **not a security boundary**.
- **WhatsApp OTP:** the code is shown in a simulated WhatsApp message.
- **Not multi-user.** Data is per browser. Notifications are in-app only.
- **Payments:** client-to-provider payment is records only. Plan checkout is simulated: nothing is charged.
- **Verification:** ticket proofs are reviewed by the demo admin. No ID documents are collected.
- **Terms and privacy** are a draft and need review by a lawyer before real use.
- **Link previews:** client-side meta only, so WhatsApp previews aren't guaranteed without SSR/prerendering. The PNG trip card is the reliable share asset.

Don't enter passwords, ID numbers, sensitive documents, or real payment details.

---

## Design system

- **Theme:** light only. All colors are CSS-variable tokens defined once in `tailwind.config.js` (the `PALETTE` object). `deep`, `snow` and `mint` are fixed tones for text placed over photos.
- **Contrast:** text and button token pairs meet WCAG AA. Turquoise buttons use dark text (`text-deep`), because white on #16B8A6 is only about 2.5:1.
- **Typography:** Manrope, self-hosted through `@fontsource-variable` (no Google Fonts request). Prices and kg use tabular numbers (the `.num` class).
- **Photography:** Unsplash photos stored in `public/images/`, with credits in `public/images/CREDITS.md`. Listing covers pick a photo by origin city, or by the first product's category for shopping listings (`src/data/images.ts`). A photo supplied by the owner always takes priority, and a styled gradient appears if an image fails to load.
- **Writing style:** no emoji (flags are shown as `SA`/`ID` country-code tags), no em-dashes, and no exclamation marks in system messages.

## Project structure

```text
src/
  app/            App.tsx (toaster, storage errors), router.tsx
  components/
    layout/       AppLayout (header, bottom nav, demo banner, footer), Guards, Logo
    landing/      TripDemo (stageshow hero demo)
    listings/     ListingCard, SaveButton, AvailabilityMeter, PromotePanel (plan panel), ShareTripCard, TicketProof
    orders/       OrderParts (timeline, actions, handover/payment/review dialogs)
    plans/        Checkout (simulated plan checkout)
    forms/        ListingWizard (weight + shopping), InquiryForms (weight/order dialogs)
    messaging/    InquiryPanel (accept/decline/cancel/complete/star rating)
    shared/       display primitives, AccountSwitcher (+useAuth), ConfirmProvider, ShareButton, ReportDialog, SafetyNotice
    ui/           button, form, dialog, dropdown-menu, misc (Card, Badge, Tabs)
  pages/          one file per route
  hooks/          useStore (useSyncExternalStore selectors), usePageMeta
  services/       storageService, store, listingService, inquiryService (orders + holds), purchaseService, messagingService, userService (magic link, OTP, mode), moderationService
  data/           seed.ts, locations.ts (configurable countries/cities)
  lib/            availability (quota, holds), plans (pricing + entitlements), trust (trust score), listingForm, search, format, dates
  stageshow/      kit/ copied from benjitaylor/skills (MIT)
  types/          domain model (discriminated union Listing = WeightListing | ShoppingListing)
```

The UI never touches `localStorage` directly. Pages call **services**, services update the **store**, and the store persists the data and notifies React through `useSyncExternalStore`.

To add a city or country, edit `src/data/locations.ts`. Indonesian copy lives in the components, and dates and numbers are formatted in `src/lib/format.ts` (locale `id-ID`) so an English version can be added later.
