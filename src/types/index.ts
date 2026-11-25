export type ListingType = 'weight' | 'shopping';
export type ListingStatus = 'draft' | 'open' | 'full' | 'closed' | 'expired';
/**
 * Order lifecycle. `pending` holds quota for 24 h, `accepted` holds it until the drop-off deadline.
 * pending -> accepted -> handed_over -> shipped -> delivered -> completed, or declined / cancelled / expired.
 */
export type InquiryStatus =
  | 'pending'
  | 'accepted'
  | 'handed_over'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired';
export type PaymentStatus = 'unpaid' | 'proof_uploaded' | 'paid';
export type AppMode = 'client' | 'provider';
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
  /** Simulated magic-link login. */
  email?: string;
  termsAcceptedAt?: string;
  /** Provider mode: WhatsApp number verified with a simulated OTP. */
  phone?: string;
  phoneVerifiedAt?: string;
  providerSince?: string;
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
  /** Proof of ticket / boarding pass, reviewed by a moderator for the "Trip terverifikasi" badge. */
  ticketProof?: TicketProof;
  /** True when this listing used a paid slot (non-frequent flyer credit) instead of the free one. */
  paidSlot?: boolean;
};

export type TicketProof = {
  imageUrl: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  note?: string;
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

export type DeclaredItem = { name: string; category: string; qty: number };

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
  /** Structured Bagasi request: one row per item, declared by the client. */
  declaredItems?: DeclaredItem[];
  /** Estimated total value of the items, in the listing currency. */
  declaredValue?: number;
  /** Client confirmed the items contain nothing on the prohibited list. */
  prohibitedAck?: boolean;
  note?: string;
  /** Legacy (v2) two-sided completion flags. */
  buyerConfirmedComplete?: boolean;
  providerConfirmedComplete?: boolean;
  /** Pending requests hold quota until this moment. */
  holdExpiresAt?: string;
  acceptedAt?: string;
  handover?: Handover;
  /** Amount due, set by the provider at handover (records only, no payment processing). */
  amountDue?: number;
  amountCurrency?: Currency;
  payment?: PaymentRecord;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  closedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type Handover = { weightKg?: number; photoUrl?: string; note?: string; at: string };

export type PaymentRecord = {
  status: PaymentStatus;
  proofUrl?: string;
  proofAt?: string;
  paidAt?: string;
  note?: string;
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
  /** Who rated whom. Missing means the client rated the provider (v1 to v3 data). */
  direction?: 'to_provider' | 'to_client';
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

export type Session = { currentUserId: string | null; mode?: AppMode };

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

export type PlanKind = 'boost' | 'nff_single' | 'nff_block' | 'pro' | 'promoted';
export type PaymentMethod = 'qris' | 'va' | 'card';

/** A simulated purchase. No money moves. */
export type Purchase = {
  id: string;
  userId: string;
  kind: PlanKind;
  listingId?: string;
  amountIdr: number;
  method: PaymentMethod;
  createdAt: string;
  expiresAt?: string;
  credits?: number;
};

export type PartnerLead = {
  id: string;
  userId?: string;
  name: string;
  brand: string;
  contact: string;
  message: string;
  status: 'new' | 'contacted';
  createdAt: string;
};

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
