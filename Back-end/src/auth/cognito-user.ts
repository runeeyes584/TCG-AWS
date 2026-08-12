import {
  DeleteUserCommand,
  GetUserCommand,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognito } from "./cognito";

export interface CognitoIdentity {
  id: string;
  email: string;
  username: string;
}

function getAttribute(
  attributes: Array<{ Name?: string; Value?: string }> | undefined,
  name: string
): string | undefined {
  return attributes?.find((attribute) => attribute.Name === name)?.Value?.trim() || undefined;
}

/**
 * Reads the currently authenticated user's attributes through the public
 * Cognito API. The Cognito Username returned by this API is intentionally not
 * used as an email or callsign; it is an internal identifier only.
 */
export async function getCognitoIdentityByAccessToken(
  accessToken: string,
  fallbackId?: string
): Promise<CognitoIdentity> {
  const result = await cognito.send(new GetUserCommand({ AccessToken: accessToken.trim() }));
  const id = getAttribute(result.UserAttributes, "sub") || fallbackId;
  const email = getAttribute(result.UserAttributes, "email");
  const username = getAttribute(result.UserAttributes, "preferred_username");

  if (!id || !email || !username) {
    throw new Error("Cognito user attributes are incomplete; email and callsign are required.");
  }

  return { id, email: email.toLowerCase(), username };
}

export async function deleteCognitoUserWithAccessToken(accessToken: string): Promise<boolean> {
  const token = accessToken.trim();
  if (!token) return false;
  try {
    await cognito.send(new DeleteUserCommand({
      AccessToken: token
    }));
    return true;
  } catch (error) {
    if (error instanceof UserNotFoundException) return false;
    throw error;
  }
}
