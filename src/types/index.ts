export type ListingType = 'weight' | 'shopping';
export type ListingStatus = 'draft' | 'open' | 'full' | 'closed' | 'expired';
export type InquiryStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
export type Currency = 'SAR' | 'IDR' | 'AUD';

export type Location = { countryCode: string; country: string; city: string };

export type User = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  city?: string;
  bio?: string;
  role: 'member' | 'admin';
  joinedAt: string;
  /** Short description shown in the demo account switcher. */
  demoTagline?: string;
  /** Demo-only label. Never represents a real identity check. */
  demoVerified?: boolean;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
  /** Optional: when missing the UI shows "Tanya harga". */
  unitPrice?: number;
  currency?: Currency;
  lastOrderDate?: string;
  /** Product-level terms, separate from the listing-level terms. */
  terms?: string;
  videoUrl?: string;
  /** Total stock offered. Remaining stock is derived from accepted inquiries. */
  quantityAvailable: number;
  variant?: string;
};

type ListingBase = {
  id: string;
  ownerId: string;
  /** Stored base status. `full` and `expired` are always derived at read time. */
  status: ListingStatus;
  title: string;
  description: string;
  origin: Location;
  destination: Location;
  /** Required for bagasi, optional for belanja. */
  departureDate?: string;
  /** Last drop-off date (bagasi) or order deadline (belanja, optional). */
  orderDeadline?: string;
  currency: Currency;
  terms: string;
  prohibitedItemsNote?: string;
  handoverMethod?: string;
  imageUrls: string[];
  acknowledgedRules: boolean;
  manuallyClosed?: boolean;
  closedByAdmin?: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type WeightListing = ListingBase & {
  type: 'weight';
  capacityKg: number;
  pricePerKg: number;
  permittedItemsNote?: string;
};

export type ShoppingListing = ListingBase & {
  type: 'shopping';
  /** Required for belanja when creating or editing. */
  arrivalDate?: string;
  products: Product[];
};

export type Listing = WeightListing | ShoppingListing;

export type InquiryLine = { productId: string; quantity: number; unitPriceSnapshot?: number };

export type Inquiry = {
  id: string;
  listingId: string;
  buyerId: string;
  providerId: string;
  status: InquiryStatus;
  requestedKg?: number;
  itemDescription?: string;
  items?: InquiryLine[];
  note?: string;
  buyerConfirmedComplete?: boolean;
  providerConfirmedComplete?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  inquiryId: string;
  participantIds: [string, string];
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  /** User id, or `system` for automatic status messages. */
  senderId: string;
  body: string;
  createdAt: string;
  readByIds: string[];
};

export type Review = {
  id: string;
  inquiryId: string;
  providerId: string;
  buyerId: string;
  /** Satisfaction level, 1 to 5. Free-text comments are intentionally not supported. */
  rating: number;
  createdAt: string;
};

export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export type Report = {
  id: string;
  reporterId: string;
  targetType: 'listing' | 'user';
  targetId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

export type Session = { currentUserId: string | null };

export type ThemePreference = 'system' | 'light' | 'dark';

export type Settings = {
  seededAt: string | null;
  theme?: ThemePreference;
  demoBannerDismissed: boolean;
  /** Data schema version; used to migrate older localStorage data. */
  schemaVersion?: number;
  /** userId -> saved listing ids */
  saved: Record<string, string[]>;
};

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
