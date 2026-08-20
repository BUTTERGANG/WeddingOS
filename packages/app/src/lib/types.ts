export interface Vendor {
  id: number;
  name: string;
  email: string;
  businessName: string | null;
  businessWebsite: string | null;
  phone: string | null;
}

export interface Client {
  id: number;
  vendorId: number;
  name: string;
  email: string;
  phone: string | null;
  partnerName: string | null;
  weddingDate: string | null;
  venue: string | null;
  notes: string | null;
  status: string;
}

export interface TimelineEvent {
  id: number;
  vendorId: number;
  clientId: number;
  title: string;
  description: string | null;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  category: string;
  sortOrder: number;
  color: string | null;
}

export interface Gallery {
  id: number;
  vendorId: number;
  clientId: number;
  title: string;
  description: string | null;
  isPublished: boolean;
  hasProofing: boolean;
}

export interface GalleryImage {
  id: number;
  galleryId: number;
  filename: string;
  originalName: string;
  storageKey: string;
  width: number | null;
  height: number | null;
  isFavorite: boolean;
  sortOrder: number;
}

export interface Invoice {
  id: number;
  vendorId: number;
  clientId: number;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Contract {
  id: number;
  vendorId: number;
  clientId: number;
  title: string;
  content: string;
  status: string;
  signedAt: string | null;
  signatureData: Record<string, unknown> | null;
}

export interface CalendarSlot {
  id: number;
  vendorId: number;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  clientId: number | null;
  serviceType: string | null;
}