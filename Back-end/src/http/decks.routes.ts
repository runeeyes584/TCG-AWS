import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { validateSaveDeckPayload } from "../decks/deck.types";
import { listUserDecks, saveUserDeck } from "../user/user.repository";

const router = Router();

function authenticatedUserId(request: any): string | undefined {
  return typeof request.user?.sub === "string" ? request.user.sub : undefined;
}

router.get("/", authenticate, async (req, res) => {
  const userId = authenticatedUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

  try {
    const decks = await listUserDecks(userId);
    return res.json({ success: true, decks });
  } catch (error) {
    const notFound = error instanceof Error && error.message === "User not found";
    console.error("GET /decks failed:", error);
    return res.status(notFound ? 404 : 500).json({
      success: false,
      message: notFound ? "User profile not found." : "Could not load decks."
    });
  }
});

router.post("/", authenticate, async (req, res) => {
  const userId = authenticatedUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

  const validation = validateSaveDeckPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
      errors: validation.errors
    });
  }

  try {
    const deck = await saveUserDeck(userId, validation.payload);
    return res.json({ success: true, message: "Deck saved successfully.", deck });
  } catch (error: any) {
    const missingProfile = error?.name === "ConditionalCheckFailedException";
    console.error("POST /decks failed:", error);
    return res.status(missingProfile ? 404 : 500).json({
      success: false,
      message: missingProfile ? "User profile not found." : "Could not save deck."
    });
  }
});

export default router;
