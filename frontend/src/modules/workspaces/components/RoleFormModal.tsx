import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { Input } from '@shared/components/ui/Input';
import { Button } from '@shared/components/ui/Button';
import { workspacesApi } from '../index';
import { CHANNEL_PERMISSIONS, PERMISSION_LABELS, ChannelPermission, Role } from '../types';

interface RoleFormModalProps {
  channelId: number;
  existingRole: Role | null;
  onClose: () => void;
  onSaved: (role: Role) => void;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  channelId,
  existingRole,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(existingRole?.name ?? '');
  const [permissions, setPermissions] = useState<ChannelPermission[]>(existingRole?.permissions ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (permission: ChannelPermission) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const role = existingRole
        ? await workspacesApi.updateRole(channelId, existingRole.role_id, { permissions })
        : await workspacesApi.createRole(channelId, { name: name.trim(), permissions });
      onSaved(role);
      onClose();
    } catch {
      setError('Failed to save role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={existingRole ? 'Edit Role' : 'Add Role'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Role Name"
          name="name"
          required
          minLength={2}
          maxLength={50}
          placeholder="e.g. Moderator"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!!existingRole}
          error={error ?? undefined}
        />
        <div>
          <span className="text-sm font-medium text-foreground">Permissions</span>
          <div className="mt-2 flex flex-col gap-2">
            {CHANNEL_PERMISSIONS.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                {PERMISSION_LABELS[permission]}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
