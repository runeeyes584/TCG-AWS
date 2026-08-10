import {
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  ListUsersCommand,
  UserNotFoundException,
  type UserType
} from "@aws-sdk/client-cognito-identity-provider";
import { cognito } from "./cognito";
import { env } from "../config/env";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailFilter(email: string): string {
  return `email = "${normalizeEmail(email).replaceAll('"', '\\"')}"`;
}

export async function findCognitoUserByEmail(email: string): Promise<UserType | null> {
  const result = await cognito.send(new ListUsersCommand({
    UserPoolId: env.userPoolId,
    Filter: emailFilter(email),
    Limit: 2
  }));

  const normalizedEmail = normalizeEmail(email);
  return result.Users?.find((user) =>
    user.Attributes?.some((attribute) =>
      attribute.Name === "email" && normalizeEmail(attribute.Value || "") === normalizedEmail
    )
  ) || null;
}

export async function getCognitoUserByEmail(email: string): Promise<UserType | null> {
  const listedUser = await findCognitoUserByEmail(email);
  if (!listedUser?.Username) return null;

  try {
    const result = await cognito.send(new AdminGetUserCommand({
      UserPoolId: env.userPoolId,
      Username: listedUser.Username
    }));
    return {
      Username: result.Username,
      Attributes: result.UserAttributes,
      UserStatus: result.UserStatus,
      Enabled: result.Enabled
    };
  } catch (error) {
    if (error instanceof UserNotFoundException) return null;
    throw error;
  }
}

export async function deleteCognitoAccountByEmail(email: string): Promise<boolean> {
  const listedUser = await findCognitoUserByEmail(email);
  if (!listedUser?.Username) return false;

  try {
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: env.userPoolId,
      Username: listedUser.Username
    }));
    return true;
  } catch (error) {
    if (error instanceof UserNotFoundException) return false;
    throw error;
  }
}
