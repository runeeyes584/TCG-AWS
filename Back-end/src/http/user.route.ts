import { Router } from "express";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { authenticate } from "../auth/auth.middleware";
import { dynamoDb } from "../config/dynamodb";
import { deleteAccount, updateUsername } from "../user/user.service";
import { sendApiError } from "./error-response";

const router = Router();
const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";

function authenticatedUserId(request: any): string | undefined {
  return typeof request.user?.sub === "string" ? request.user.sub : undefined;
}

async function getUserProfile(userId: string) {
  const result = await dynamoDb.send(new GetCommand({
    TableName: userProfileTable,
    Key: { user_id: userId },
    ConsistentRead: true
  }));
  return result.Item ?? null;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    const user = await getUserProfile(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user });
  } catch (error) {
    console.error("GET /user/me failed:", error);
    return sendApiError(res, error, "Unable to load user profile.");
  }
});

router.patch("/avatar", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    const { avatar } = req.body;
    if (typeof avatar !== "string" || avatar.trim() === "") return res.status(400).json({ success: false, message: "Avatar is required." });
    if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(avatar)) return res.status(400).json({ success: false, message: "Invalid image format." });
    if (Buffer.byteLength(avatar, "utf8") > 300 * 1024) return res.status(400).json({ success: false, message: "Avatar is too large. Maximum size is 300KB." });
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: userProfileTable, Key: { user_id: userId },
      UpdateExpression: "SET avatar_url = :avatar", ExpressionAttributeValues: { ":avatar": avatar }, ReturnValues: "ALL_NEW"
    }));
    return res.json({ success: true, message: "Avatar updated successfully.", user: result.Attributes });
  } catch (error) {
    console.error("PATCH /user/avatar failed:", error);
    return sendApiError(res, error, "Unable to update avatar.");
  }
});

router.patch("/username", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (typeof req.body?.username !== "string") return res.status(400).json({ success: false, message: "Username is required." });
    const username = req.body.username.trim();
    if (username.length < 3 || username.length > 20) return res.status(400).json({ success: false, message: "Username must be between 3 and 20 characters." });
    const user = await updateUsername(userId, username);
    return res.json({ success: true, message: "Username updated successfully.", user });
  } catch (error) {
    console.error("PATCH /user/username failed:", error);
    return sendApiError(res, error, "Unable to update username.");
  }
});

router.delete("/account", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    const tokenUser = (req as any).user;
    const email = typeof tokenUser?.username === "string" ? tokenUser.username.trim().toLowerCase() : undefined;
    if (!userId || !email) return res.status(401).json({ success: false, message: "Unauthorized." });
    await deleteAccount(userId, email);
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie("email");
    return res.json({ success: true, message: "Your account has been deleted successfully." });
  } catch (error) {
    console.error("DELETE /user/account failed:", error);
    return sendApiError(res, error, "Unable to delete account.");
  }
});

export default router;
