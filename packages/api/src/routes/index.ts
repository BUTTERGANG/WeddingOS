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