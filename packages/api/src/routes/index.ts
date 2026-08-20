import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { vendorsRouter } from "./vendors.routes.js";
import { clientsRouter } from "./clients.routes.js";
import { timelineRouter } from "./timeline.routes.js";
import { galleriesRouter } from "./galleries.routes.js";
import { invoicesRouter } from "./invoices.routes.js";
import { contractsRouter } from "./contracts.routes.js";
import { calendarRouter } from "./calendar.routes.js";
import { publicGalleryRouter } from "./gallery-public.routes.js";
import { publicCalendarRouter } from "./calendar-public.routes.js";
import { printProductsRouter } from "./print-products.routes.js";
import { printStoreRouter } from "./print-store.routes.js";
import { pricingRouter } from "./pricing.routes.js";
import { blogRouter } from "./blog.routes.js";
import { sitePagesRouter } from "./site-pages.routes.js";
import { adminAuthRouter } from "./admin-auth.routes.js";
import { adminRouter } from "./admin.routes.js";
import { adminSettingsRouter } from "./admin-settings.routes.js";
import { marketplaceRouter } from "./marketplace.routes.js";
import { vendorMarketplaceRouter } from "./vendor-marketplace.routes.js";
import { vendorPartnersRouter } from "./vendor-partners.routes.js";
import { sharedClientsRouter } from "./shared-clients.routes.js";

export const routes = Router();

routes.use("/api/auth", authRouter);
routes.use("/api/vendors", vendorsRouter);
routes.use("/api/clients", clientsRouter);
routes.use("/api/timeline", timelineRouter);
routes.use("/api/galleries", galleriesRouter);
routes.use("/api/invoices", invoicesRouter);
routes.use("/api/contracts", contractsRouter);
routes.use("/api/calendar", calendarRouter);

routes.use("/api/g/public", publicGalleryRouter);

routes.use("/api/calendar/public", publicCalendarRouter);

routes.use("/api/print-products", printProductsRouter);
routes.use("/api/print-store", printStoreRouter);
routes.use("/api/pricing", pricingRouter);

routes.use("/api/blog", blogRouter);
routes.use("/api/site-pages", sitePagesRouter);

// Admin routes
routes.use("/api/admin/auth", adminAuthRouter);
routes.use("/api/admin", adminRouter);
routes.use("/api/admin/settings", adminSettingsRouter);

// Marketplace routes (public)
routes.use("/api/marketplace", marketplaceRouter);

// Vendor marketplace routes (protected)
routes.use("/api/vendor/marketplace", vendorMarketplaceRouter);

// Multi-vendor routes
routes.use("/api/vendor-partners", vendorPartnersRouter);
routes.use("/api/shared-clients", sharedClientsRouter);