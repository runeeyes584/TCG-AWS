"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PrivateRoomScreen } from "../../components/lobby/PrivateRoomScreen";

function JoinRoomContent() {
  const searchParams = useSearchParams();
  return <PrivateRoomScreen mode="join" initialRoomCode={searchParams.get("room") || undefined} />;
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={null}>
      <JoinRoomContent />
    </Suspense>
  );
}
