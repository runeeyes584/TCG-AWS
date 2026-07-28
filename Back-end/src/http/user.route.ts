import { Router } from "express";
import { GetCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { authenticate } from "../auth/auth.middleware";
import { dynamoDb } from "../config/dynamodb";

const router = Router();

const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";

function authenticatedUserId(request: any): string | undefined {
  return typeof request.user?.sub === "string"
    ? request.user.sub
    : undefined;
}

async function getUserProfile(userId: string) {
  const result = await dynamoDb.send(
    new GetCommand({
      TableName: userProfileTable,
      Key: {
        user_id: userId,
      },
      ConsistentRead: true,
    })
  );

  return result.Item ?? null;
}

async function updateAvatar(userId: string, avatarUrl: string) {
  await dynamoDb.send(
    new UpdateCommand({
      TableName: userProfileTable,
      Key: {
        user_id: userId,
      },
      UpdateExpression: "SET avatar_url = :avatar",
      ExpressionAttributeValues: {
        ":avatar": avatarUrl,
      },
      ReturnValues: "NONE",
    })
  );

  return getUserProfile(userId);
}

/**
 * GET /user/me
 * Lấy thông tin user hiện tại
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const user = await getUserProfile(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GET /user/me failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load user profile.",
    });
  }
});

router.patch("/avatar", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const { avatar } = req.body;

    if (typeof avatar !== "string" || avatar.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Avatar is required.",
      });
    }

    // Chỉ chấp nhận Data URL Base64 của ảnh
    const isValid =
      /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(avatar);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format.",
      });
    }

    // Giới hạn khoảng 300KB dữ liệu Base64
    const sizeInBytes = Buffer.byteLength(avatar, "utf8");

    if (sizeInBytes > 300 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Avatar is too large. Maximum size is 300KB.",
      });
    }

    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: userProfileTable,
        Key: {
          user_id: userId,
        },
        UpdateExpression: "SET avatar_url = :avatar",
        ExpressionAttributeValues: {
          ":avatar": avatar,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return res.json({
      success: true,
      message: "Avatar updated successfully.",
      user: result.Attributes,
    });
  } catch (error) {
    console.error("PATCH /user/avatar failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update avatar.",
    });
  }
});

router.patch("/username", authenticate, async (req, res) => {
    try {
        const userId = authenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        const { username } = req.body;

        if (typeof username !== "string") {
            return res.status(400).json({
                success: false,
                message: "Username is required."
            });
        }

        const newUsername = username.trim();

        if (newUsername.length < 3 || newUsername.length > 20) {
            return res.status(400).json({
                success: false,
                message: "Username must be between 3 and 20 characters."
            });
        }

        // Không cập nhật nếu tên không đổi
        const currentUser = await getUserProfile(userId);

        if (currentUser?.username === newUsername) {
            return res.json({
                success: true,
                message: "Username unchanged.",
                user: currentUser
            });
        }

        // Kiểm tra username đã tồn tại chưa
        const existed = await dynamoDb.send(
            new ScanCommand({
                TableName: userProfileTable,
                FilterExpression: "#username = :username AND user_id <> :userId",
                ExpressionAttributeNames: {
                    "#username": "username"
                },
                ExpressionAttributeValues: {
                    ":username": newUsername,
                    ":userId": userId
                },
                Limit: 1
            })
        );

        if ((existed.Items?.length ?? 0) > 0) {
            return res.status(409).json({
                success: false,
                message: "Username already exists."
            });
        }

        const result = await dynamoDb.send(
            new UpdateCommand({
                TableName: userProfileTable,
                Key: {
                    user_id: userId
                },
                UpdateExpression: "SET username = :username",
                ExpressionAttributeValues: {
                    ":username": newUsername
                },
                ReturnValues: "ALL_NEW"
            })
        );

        return res.json({
            success: true,
            message: "Username updated successfully.",
            user: result.Attributes
        });

    } catch (error) {
        console.error("PATCH /user/username failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update username."
        });
    }
});

export default router;