import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import userContactsRouter from "./user-contacts";
import userEventsRouter from "./user-events";
import userNotesRouter from "./user-notes";
import geminiKeyRouter from "./gemini-key";
import scanRouter from "./scan";
import profileRouter from "./profile";
import connectionsRouter from "./connections";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(userContactsRouter);
router.use(userEventsRouter);
router.use(userNotesRouter);
router.use(geminiKeyRouter);
router.use(scanRouter);
router.use(profileRouter);
router.use(connectionsRouter);

export default router;
