import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import taxReturnsRouter from "./taxReturns";
import w2DocumentsRouter from "./w2Documents";
import aiAgentRouter from "./aiAgent";
import knowledgeGraphRouter from "./knowledgeGraph";
import testReportsRouter from "./testReports";
import logsRouter from "./logs";
import usersRouter from "./users";
import openrouterRouter from "./openrouter";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(taxReturnsRouter);
router.use(w2DocumentsRouter);
router.use(aiAgentRouter);
router.use(knowledgeGraphRouter);
router.use(testReportsRouter);
router.use(logsRouter);
router.use(usersRouter);
router.use(openrouterRouter);
router.use(adminRouter);

export default router;
