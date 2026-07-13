import { Router } from "express";
import * as controller from "./auth.controller";
import { authenticate } from "./auth.middleware";

const router = Router();

router.post("/register", controller.register);
router.post("/verify", controller.verify);
router.post("/login", controller.login);
router.post("/logout", controller.logout);
router.get("/me", authenticate, controller.me);
router.post("/refresh", controller.refresh);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

export default router;