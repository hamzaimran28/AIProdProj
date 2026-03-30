import { Router } from "express";
import { postGenerate } from "../controllers/generate.controller.js";

export const generateRouter = Router();

generateRouter.post("/", (req, res, next) => {
  void postGenerate(req, res).catch(next);
});
