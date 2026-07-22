import { PublishModal } from "./PublishModal";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { SecurityModal } from "./SecurityModal";
import { SemanticSearchModal } from "./SemanticSearchModal";
import { AIChatPanel } from "./AIChatPanel";
import { TeamWorkspaceModal } from "./TeamWorkspaceModal";
import { AuthScreen } from "./AuthScreen";
import { useAuthStore } from "../store/useAuthStore";
import { useNoteStore } from "../store/useNoteStore";

interface ModalManagerProps {
  modals: Record<string, boolean>;
  onCloseModal: (modalName: string) => void;
}

export function ModalManager({ modals, onCloseModal }: ModalManagerProps) {
  const docId = useNoteStore((s) => s.docId);
  const documents = useNoteStore((s) => s.documents);
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentDoc = documents[docId];

  return (
    <>
      <PublishModal
        isOpen={Boolean(modals["publish"])}
        onClose={() => onCloseModal("publish")}
      />
      <VersionHistoryModal
        isOpen={Boolean(modals["history"])}
        onClose={() => onCloseModal("history")}
      />
      <SecurityModal
        isOpen={Boolean(modals["security"])}
        onClose={() => onCloseModal("security")}
        currentDocId={docId}
        currentDocTitle={currentDoc?.title || "Untitled"}
        currentDocContent={currentDoc?.editorState || ""}
        onEncryptDoc={(encState) => {
          useNoteStore.getState().updateContentForDoc(docId, encState);
        }}
        onDecryptDoc={(plainText) => {
          useNoteStore.getState().updateContentForDoc(docId, plainText);
        }}
      />
      <SemanticSearchModal
        isOpen={Boolean(modals["search"])}
        onClose={() => onCloseModal("search")}
      />
      <AIChatPanel
        isOpen={Boolean(modals["ai"])}
        onClose={() => onCloseModal("ai")}
      />
      <TeamWorkspaceModal
        isOpen={Boolean(modals["team"])}
        onClose={() => onCloseModal("team")}
        currentDocId={docId}
        currentUserId={session?.user?.id ?? "guest"}
        currentUserName={session?.user?.email?.split("@")[0] ?? "Guest"}
        currentUserEmail={session?.user?.email ?? "guest@local.dev"}
      />
      {modals["auth"] && !isAuthenticated && (
        <AuthScreen />
      )}
    </>
  );
}
