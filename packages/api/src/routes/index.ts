import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { vendorsRouter } from "./vendors.routes.js";
import { clientsRouter } from "./clients.routes.js";
import { timelineRouter } from "./timeline.routes.js";
import { galleriesRouter } from "./galleries.routes.js";
import { invoicesRouter } from "./invoices.routes.js";
import { contractsRouter } from "./contracts.routes.js";
import { calendarRouter } from "./calendar.routes.js";

export const routes = Router();

routes.use("/api/auth", authRouter);
routes.use("/api/vendors", vendorsRouter);
routes.use("/api/clients", clientsRouter);
routes.use("/api/timeline", timelineRouter);
routes.use("/api/galleries", galleriesRouter);
routes.use("/api/invoices", invoicesRouter);
routes.use("/api/contracts", contractsRouter);
routes.use("/api/calendar", calendarRouter);