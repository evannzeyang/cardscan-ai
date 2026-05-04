import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import userContactsRouter from "./user-contacts";
import userEventsRouter from "./user-events";
import userNotesRouter from "./user-notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(userContactsRouter);
router.use(userEventsRouter);
router.use(userNotesRouter);

export default router;
