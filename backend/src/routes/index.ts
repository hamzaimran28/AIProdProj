import { Router } from "express";
import { generateRouter } from "./generate.routes.js";

export const apiRouter = Router();

apiRouter.use("/generate", generateRouter);
