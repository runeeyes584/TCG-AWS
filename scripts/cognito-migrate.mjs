import crypto from "node:crypto";
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

// User Migration trigger of the new pool (account 9772). Moves a player from the old pool (account 1650) the
// first time they sign in, or ask for a password reset, keeping their password and their old `sub`.
const {
  LEGACY_REGION,
  LEGACY_POOL_ID,
  LEGACY_CLIENT_ID,
  LEGACY_CLIENT_SECRET,
  LEGACY_ROLE_ARN
} = process.env;

const legacyAuth = new CognitoIdentityProviderClient({ region: LEGACY_REGION });
const sts = new STSClient({});

/** Admin client of the old pool, through the role of account 1650; reused until shortly before it expires. */
let legacyAdmin;
let legacyAdminExpiresAt = 0;

async function getLegacyAdmin() {
  if (legacyAdmin && Date.now() < legacyAdminExpiresAt - 60_000) return legacyAdmin;
  const { Credentials } = await sts.send(new AssumeRoleCommand({
    RoleArn: LEGACY_ROLE_ARN,
    RoleSessionName: "chrono-user-migration",
    DurationSeconds: 900
  }));
  legacyAdmin = new CognitoIdentityProviderClient({
    region: LEGACY_REGION,
    credentials: {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken
    }
  });
  legacyAdminExpiresAt = Credentials.Expiration.getTime();
  return legacyAdmin;
}

function secretHash(username) {
  return crypto
    .createHmac("sha256", LEGACY_CLIENT_SECRET)
    .update(username + LEGACY_CLIENT_ID)
    .digest("base64");
}

/** Claims of a token Cognito has just issued to this function over TLS; there is nothing to verify. */
function tokenClaims(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

/** The attributes the new user is created with. `legacy_sub` lets the backend move the player's data. */
function migratedAttributes({ sub, email, preferredUsername }) {
  if (!sub || !email) throw new Error("The legacy account is incomplete.");
  return {
    email: email.toLowerCase(),
    email_verified: "true",
    ...(preferredUsername ? { preferred_username: preferredUsername } : {}),
    "custom:legacy_sub": sub
  };
}

async function migrateOnSignIn(username, password) {
  let result;
  try {
    result = await legacyAuth.send(new InitiateAuthCommand({
      ClientId: LEGACY_CLIENT_ID,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: username, PASSWORD: password, SECRET_HASH: secretHash(username) }
    }));
  } catch (error) {
    // A wrong password, an unknown or an unconfirmed account: the player is not moved.
    console.warn("Legacy sign-in refused:", error?.name);
    throw new Error("Bad credentials.");
  }

  const idToken = result.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error("The legacy account needs an extra step to sign in.");
  const claims = tokenClaims(idToken);
  return migratedAttributes({
    sub: claims.sub,
    email: claims.email,
    preferredUsername: claims.preferred_username
  });
}

async function migrateOnForgotPassword(username) {
  const admin = await getLegacyAdmin();
  let user;
  try {
    user = await admin.send(new AdminGetUserCommand({ UserPoolId: LEGACY_POOL_ID, Username: username }));
  } catch (error) {
    console.warn("Legacy user lookup refused:", error?.name);
    throw new Error("Unknown user.");
  }
  if (user.UserStatus !== "CONFIRMED" || user.Enabled === false) throw new Error("Unknown user.");

  const attribute = (name) => user.UserAttributes?.find((item) => item.Name === name)?.Value;
  return migratedAttributes({
    sub: attribute("sub"),
    email: attribute("email"),
    preferredUsername: attribute("preferred_username")
  });
}

export const handler = async (event) => {
  const username = String(event.userName || "").trim().toLowerCase();

  if (event.triggerSource === "UserMigration_Authentication") {
    event.response.userAttributes = await migrateOnSignIn(username, event.request.password);
    event.response.finalUserStatus = "CONFIRMED";
    event.response.messageAction = "SUPPRESS";
  } else if (event.triggerSource === "UserMigration_ForgotPassword") {
    // The user is created unconfirmed; Cognito then sends the reset code to the verified email.
    event.response.userAttributes = await migrateOnForgotPassword(username);
    event.response.messageAction = "SUPPRESS";
  } else {
    throw new Error(`Unsupported trigger: ${event.triggerSource}`);
  }

  console.log("Migrated user", { triggerSource: event.triggerSource, legacySub: event.response.userAttributes["custom:legacy_sub"] });
  return event;
};