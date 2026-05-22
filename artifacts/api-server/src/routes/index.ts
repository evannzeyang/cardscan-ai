import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import userContactsRouter from "./user-contacts";
import userEventsRouter from "./user-events";
import userNotesRouter from "./user-notes";
import geminiKeyRouter from "./gemini-key";
import scanRouter from "./scan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(userContactsRouter);
router.use(userEventsRouter);
router.use(userNotesRouter);
router.use(geminiKeyRouter);
router.use(scanRouter);

export default router;
