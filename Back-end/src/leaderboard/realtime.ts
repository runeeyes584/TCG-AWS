import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";

export interface RealtimeProfileEvent {
  event: "profile:updated" | "rank:changed";
  [key: string]: unknown;
}

function client(): ApiGatewayManagementApiClient | undefined {
  const endpoint = process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "");
  return endpoint ? new ApiGatewayManagementApiClient({ endpoint, region }) : undefined;
}

export async function notifyConnection(
  connectionId: string | undefined,
  payload: RealtimeProfileEvent
): Promise<boolean> {
  if (!connectionId) return false;
  const ws = client();
  if (!ws) {
    console.warn("WS_MANAGEMENT_ENDPOINT is missing; realtime profile event was skipped.");
    return false;
  }

  try {
    await ws.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(payload))
    }));
    return true;
  } catch (error: any) {
    if (error instanceof GoneException || error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410) {
      // API Gateway already removed the socket. There is no useful retry.
      return false;
    }
    throw error;
  }
}

export async function notifyConnections(
  messages: Array<{ connectionId?: string; payload: RealtimeProfileEvent }>
): Promise<void> {
  const results = await Promise.allSettled(
    messages.map(({ connectionId, payload }) => notifyConnection(connectionId, payload))
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Unable to publish realtime profile event:", result.reason);
    }
  }
}
