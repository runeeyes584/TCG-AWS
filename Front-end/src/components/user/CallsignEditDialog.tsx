"use client";

import { useState } from "react";
import { Check, UserRound, X } from "lucide-react";
import { Button } from "../ui/button";
import { FormMessage, TextField } from "../ui/form";
import { BoardDialog } from "../ui/modal";
import { CALLSIGN_MAX_LENGTH, sanitizeCallsign, validateCallsign } from "../../libs/callsign";
import styles from "./CallsignEditDialog.module.css";

export interface CallsignEditDialogProps {
  /** The callsign now; the field starts with it. */
  currentName: string;
  /** When the next change is possible, said as the player should read it. */
  cooldownNotice: string;
  saving: boolean;
  onSave: (callsign: string) => void;
  onCancel: () => void;
}

/** The dialog in which an operative changes the callsign. It lets through only what a callsign can hold, in its own case. */
export function CallsignEditDialog({ currentName, cooldownNotice, saving, onSave, onCancel }: CallsignEditDialogProps) {
  const [value, setValue] = useState(currentName);
  const error = validateCallsign(value);
  const canSave = !error && value !== currentName && !saving;

  const save = () => {
    if (canSave) onSave(value);
  };

  return (
    <BoardDialog
      badge="Identity control"
      title="Edit operative callsign"
      titleId="callsign-edit-title"
      tone="azure"
      maxWidth={460}
      // Not dismissible while the change is being saved: closing then would hide its result.
      onClose={saving ? undefined : onCancel}
      actions={
        <>
          <Button chamfer size="md" tone="red" icon={<X size={14} />} onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            chamfer
            size="md"
            variant="success"
            icon={<Check size={14} />}
            onClick={save}
            disabled={!canSave}
            loading={saving}
            loadingText="Saving..."
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.notice}>{cooldownNotice}</p>
        <TextField
          label="New callsign"
          icon={<UserRound size={17} />}
          value={value}
          onChange={(event) => setValue(sanitizeCallsign(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          maxLength={CALLSIGN_MAX_LENGTH}
          invalid={Boolean(error)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          disabled={saving}
        />
        {error ? (
          <FormMessage tone="inline">{error}</FormMessage>
        ) : (
          <FormMessage tone="hint">
            Use 3–20 letters, numbers, or underscores. Capital letters are kept. The name must be unique.
          </FormMessage>
        )}
      </div>
    </BoardDialog>
  );
}
