"use client";

import { useState } from "react";

import { AddPasskeyForm } from "./add-passkey-form";
import { PasskeyList } from "./passkey-list";
import { usePasskeys } from "./use-passkeys";

export function PasskeySection() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const {
    addPasskey,
    clearMessage,
    deletePasskey,
    isBusy,
    isLoading,
    message,
    passkeys,
    pendingAction,
    refreshPasskeys,
    renamePasskey,
  } = usePasskeys();

  async function handleRename(id: string, name: string) {
    if (await renamePasskey(id, name)) {
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (await deletePasskey(id)) {
      setDeleteCandidateId(null);
    }
  }

  return (
    <div aria-busy={isLoading || isBusy}>
      <div>
        <h3
          className="m-0 text-[1.5rem] font-[540] tracking-[-0.035em]"
          lang="en"
        >
          Registered passkeys
        </h3>
        <p className="mt-3 text-sm leading-body text-muted-foreground">
          注册、重命名和移除需要最近 10 分钟内建立的登录 Session。
        </p>
      </div>

      <div className="mt-7 border-t border-border pt-7">
        <PasskeyList
          confirmingDeleteId={deleteCandidateId}
          disabled={isBusy}
          editingId={editingId}
          isLoading={isLoading}
          onCancelDelete={() => setDeleteCandidateId(null)}
          onCancelRename={() => setEditingId(null)}
          onDelete={handleDelete}
          onRename={handleRename}
          onStartDelete={(id) => {
            setDeleteCandidateId(id);
            setEditingId(null);
            clearMessage();
          }}
          onStartRename={(id) => {
            setEditingId(id);
            setDeleteCandidateId(null);
            clearMessage();
          }}
          passkeys={passkeys}
          pendingAction={pendingAction}
        />
      </div>

      <AddPasskeyForm
        disabled={isBusy}
        message={message}
        onAdd={addPasskey}
        onRefresh={refreshPasskeys}
        pending={pendingAction === "add"}
      />
    </div>
  );
}
