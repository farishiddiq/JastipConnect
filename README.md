# JastipConnect

**Titip barang, temukan perjalanan, terhubung dengan diaspora.**

JastipConnect is a demo of a jastip (personal-courier) marketplace for the Indonesian diaspora, with two corridors: Saudi Arabia ↔ Indonesia and Australia ↔ Indonesia. Each direction is its own listing. It's a mobile-first web app with two listing types:

- **Jastip Bagasi (by weight):** a traveler posts a route, dates, spare baggage (kg), a fee per kg, and a last drop-off date. Buyers ask about sending items by giving an estimated weight.
- **Jastip Belanja (by item):** a personal shopper posts a catalog of products. Arrival date is required; departure date, order deadline, and the product's price, currency, description, last order date, photo/video and terms are all optional. Items without a price show "Tanya harga". Buyers order products by quantity.

The app is built with React, TypeScript, Vite, Tailwind CSS, and shadcn-style components (Radix primitives). It uses lucide-react icons, React Router, and sonner for toasts.
**All data lives in the browser's `localStorage`. There is no backend.**

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

## 5-minute demo flow

1. Open `/`. You're browsing as a guest. Search for **Riyadh**, or pick the popular route **Riyadh → Jakarta**.
2. Open the listing **"Bagasi kosong Riyadh → Jakarta, 20 kg"** and click **Tanya Provider**. As a guest, you'll be asked to pick a demo account. Choose **Aisyah**.
3. Fill in the inquiry (for example, 4 kg). You're taken to the conversation in the Inbox.
4. Click **"Balas sebagai Ahmad"** in the chat header to switch to the provider account. Click **Terima** and the quota drops from 15 kg to 11 kg. Send a message.
5. Click **Tandai selesai** as Ahmad. Switch back to Aisyah and click **Konfirmasi selesai**. Then click **Beri penilaian** to give a 1 to 5 star rating (one rating per transaction, no free-text comments).
6. As **Ahmad**, go to `/post` → Jastip Bagasi. Fill in the wizard and publish. Refresh the page and the listing is still there.
7. Open a listing that isn't yours, click **Laporkan**, then switch to **Admin Demo** and go to `/admin` to moderate it.
8. Go to `/profile` → **Reset Data Demo** to restore the initial data.

### Demo accounts (no password)

| Account | Role |
|---|---|
| Aisyah Putri | Buyer in Jakarta |
| Ahmad Fauzi | Baggage (weight) provider in Riyadh |
| Nadia Rahma | Shopping provider in Jeddah |
| Admin Demo | Demo moderator (`/admin`) |

The seed data also includes Siti, Rizky, and Budi, so the marketplace looks lived-in. You can pick these accounts too. You can also create a new local profile (name and city only).

---

## Routes

| Route | Page | Access |
|---|---|---|
| `/` | Home: hero search, categories, featured & new listings, how it works, safety, CTA | Public |
| `/explore` | Search + filters (synced to the URL query string) | Public |
| `/listings/:id` | Listing detail (buyer CTA or owner actions) | Public |
| `/providers/:id` | Public provider profile + star ratings | Public |
| `/post` | Pick a type → listing wizard | Member |
| `/listings/:id/edit` | Edit / continue a draft | Owner |
| `/my-listings` | Active / Full / Closed / Draft tabs, metrics | Member |
| `/inbox`, `/inbox/:conversationId` | Two-pane inbox + inquiry actions | Participant |
| `/saved` | Saved listings | Member |
| `/profile` | Profile, account switcher, **Reset Data Demo** | Member (reset is open to everyone) |
| `/admin` | Moderation dashboard | Admin Demo |
| `/safety` | Prohibited items, rules, demo limitations | Public |
| `*` | 404 | Public |

Filters on `/explore` live in the query string (`q`, `type`, `oc`, `ocity`, `dc`, `dcity`, `from`, `to`, `all`, `cur`, `pmin`, `pmax`, `sort`). For example, `/explore?oc=SA&ocity=Riyadh&dc=ID&dcity=Jakarta` is a shareable link.

---

## Business rules

- **Weight listing quota:** remaining = total kg − the kg in **accepted + completed** inquiries. Pending, declined, and cancelled inquiries don't use up quota. Acceptance re-checks the quota against the latest data, so you can't accept more than what's left.
- **Shopping listing stock:** stock is reserved only when an order is **accepted**. The app prevents overselling. A product shows **Sold Out** when its stock runs out, and when every product is out the listing becomes `Full`.
- **Derived status:** `draft` → `closed` (closed manually or by the admin) → `expired` (past the drop-off/order deadline) → `full` → `open`. A manually closed listing is **never reopened automatically** when quota frees up.
- **Edit limits:** capacity or stock can't go below what's already accepted. A product with active orders can't be removed.
- **Bagasi is one-way.** No return date or return trip. A provider who travels both ways posts two independent listings.
- **Default order:** dated departures first (earliest first, ties by last drop-off or order date), then listings without a departure date by arrival date. Missing dates sort last and are never invented.
- **Inquiry stages:** `Menunggu` → `Diterima` (shown as `Berlangsung`, or `Menunggu konfirmasi` once one side has confirmed) → `Selesai`; also `Ditolak` and `Dibatalkan`. Payment is arranged off-platform.
- **Completion:** both buyer and provider must confirm. Only a completed transaction can be rated, and only by the buyer, once, with 1 to 5 stars.
- **Cancellation:** the buyer can cancel a pending or accepted inquiry. Cancelling releases the reserved quota or stock.
- **Admin:** can close (unpublish) a reported listing. The owner can't reopen it until the admin lifts the block.

---

## localStorage contract

Versioned namespace `jc:v1:`, with `settings.schemaVersion` (currently 2). Older data is migrated once on load: round-trip fields are dropped, belanja gets an arrival date, zero prices become unpriced, review comments are discarded, and the Australia demo data is merged in by id without touching user-created data.

`jc:v1:users`, `jc:v1:session`, `jc:v1:listings`, `jc:v1:inquiries`, `jc:v1:conversations`, `jc:v1:messages`, `jc:v1:reviews`, `jc:v1:reports`, `jc:v1:notifications`, `jc:v1:settings` (includes the per-user saved list and a seed marker).

- **Seeds only on the first visit** (`settings.seededAt`). Reloading never overwrites data you created.
- Reads use a safe JSON parse with shape validation and fall back to defaults. Writes catch the quota-exceeded error and show a toast. If `localStorage` isn't available, the app runs in memory and shows a warning.
- Multi-collection changes, such as an inquiry plus its conversation, message, and notification, are written in one transaction and rolled back if a write fails.
- Changes in other tabs sync through the `storage` event.
- **Reset Data Demo** (`/profile`) clears the namespace and re-seeds it after a confirmation.

---

## What's simulated (and what isn't)

The app shows these limits in a demo banner, on `/safety#demo`, and in microcopy near the relevant features.

- **No real login.** The account switcher is a demo with no password. Access checks (owner, participant, admin) run in the app only and are **not a security boundary**.
- **Not multi-user.** `localStorage` is per browser and device. "Chatting between accounts" only works by switching accounts in the same browser. There's no real-time messaging, push notifications, email, SMS, or WhatsApp.
- **No payments.** No escrow, payment gateway, or fees. The **Promosikan Listing** panel is a "Segera Hadir" (coming soon) preview and can't be purchased.
- **No identity verification.** The "Verifikasi demo" (demo verification) label is cosmetic. Other users show "Belum diverifikasi" (not yet verified).
- **No currency conversion.** Prices are shown in SAR, AUD or IDR as listed. Sorting by price groups listings by currency.
- **Not legal advice.** The prohibited-items list is a non-exhaustive example. Airline rules, customs, and import/export rules are the users' responsibility.
- **Link previews:** the page title and meta description are updated on the client side. Because this is a client-only SPA, **WhatsApp and social Open Graph previews can't be guaranteed** without server-side rendering or prerendering.
- **Share:** uses `navigator.share` when available. Otherwise it copies the link to the clipboard, and if that also fails, it shows the link in a dialog for manual copying.
- Images: seed listings use generated route illustrations and category emoji, with no external images. If a URL you enter fails to load, the app falls back to the illustration.

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
    listings/     ListingCard, SaveButton, AvailabilityMeter, PromotePanel
    forms/        ListingWizard (weight + shopping), InquiryForms (weight/order dialogs)
    messaging/    InquiryPanel (accept/decline/cancel/complete/star rating)
    shared/       display primitives, AccountSwitcher (+useAuth), ConfirmProvider, ShareButton, ReportDialog, SafetyNotice
    ui/           button, form, dialog, dropdown-menu, misc (Card, Badge, Tabs)
  pages/          one file per route
  hooks/          useStore (useSyncExternalStore selectors), usePageMeta
  services/       storageService, store, listingService, inquiryService, messagingService, userService, moderationService
  data/           seed.ts, locations.ts (configurable countries/cities)
  lib/            availability (derived quota/stock/status), listingForm (validation), search, format, dates
  types/          domain model (discriminated union Listing = WeightListing | ShoppingListing)
```

The UI never touches `localStorage` directly. Pages call **services**, services update the **store**, and the store persists the data and notifies React through `useSyncExternalStore`.

To add a city or country, edit `src/data/locations.ts`. Indonesian copy lives in the components, and dates and numbers are formatted in `src/lib/format.ts` (locale `id-ID`) so an English version can be added later.
