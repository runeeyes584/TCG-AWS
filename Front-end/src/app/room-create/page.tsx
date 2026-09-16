import { PrivateRoomScreen } from "../../components/lobby/PrivateRoomScreen";
import { AuthGuard } from "../../components/lobby/AuthGuard";

export default function CreateRoomPage() {
  return (
    <AuthGuard animatedBackdrop={false}>
      <PrivateRoomScreen mode="create" />
    </AuthGuard>
  );
}

