import React, { useEffect, useState } from 'react';
import { Modal } from '@shared/components/Modal';
import { workspacesApi } from '../index';
import { PERMISSION_LABELS, ChannelMember, Role } from '../types';
import { RoleFormModal } from './RoleFormModal';

interface ManageRolesModalProps {
  channelId: number;
  onClose: () => void;
}

// The Owner role is auto-assigned to the channel creator and cannot be deleted.
const OWNER_ROLE_NAME = 'owner';
const isOwnerRole = (role: Role) => role.name.trim().toLowerCase() === OWNER_ROLE_NAME;

export const ManageRolesModal: React.FC<ManageRolesModalProps> = ({ channelId, onClose }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFormTarget, setRoleFormTarget] = useState<'new' | Role | null>(null);
  const [assignUserId, setAssignUserId] = useState<number | ''>('');
  const [assignRoleId, setAssignRoleId] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([workspacesApi.listRoles(channelId), workspacesApi.listMembers(channelId)]).then(
      ([roleList, memberList]) => {
        if (cancelled) return;
        setRoles(roleList);
        setMembers(memberList);
        setIsLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const handleDeleteRole = async (role: Role) => {
    if (isOwnerRole(role)) return;
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setError(null);
    try {
      await workspacesApi.deleteRole(channelId, role.role_id);
      setRoles((prev) => prev.filter((r) => r.role_id !== role.role_id));
    } catch {
      setError(`Failed to delete role "${role.name}".`);
    }
  };

  const handleAssign = async () => {
    if (assignUserId === '' || assignRoleId === '') return;
    setError(null);
    setIsAssigning(true);
    try {
      await workspacesApi.assignRole(channelId, assignUserId, assignRoleId);
      setAssignUserId('');
      setAssignRoleId('');
    } catch {
      setError('Failed to assign role.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Modal title="Manage Roles" onClose={onClose}>
      {error && <p className="error-text">{error}</p>}
      {isLoading && <p className="list-row-subtitle">Loading roles...</p>}

      {!isLoading && (
        <>
          {roles.map((role) => (
            <div key={role.role_id} className="list-row">
              <div>
                <div className="list-row-title">{role.name}</div>
                <div className="list-row-subtitle">
                  {role.permissions.map((p) => PERMISSION_LABELS[p]).join(', ') ||
                    'No permissions'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn" onClick={() => setRoleFormTarget(role)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isOwnerRole(role)}
                  title={isOwnerRole(role) ? 'The Owner role cannot be deleted' : undefined}
                  onClick={() => handleDeleteRole(role)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn btn-block"
            style={{ marginTop: 12 }}
            onClick={() => setRoleFormTarget('new')}
          >
            Add Role
          </button>

          <div className="sidebar-section-title" style={{ marginLeft: 0 }}>
            Assign Role to Member
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.nickname_in_channel}
                </option>
              ))}
            </select>
            <select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              disabled={assignUserId === '' || assignRoleId === '' || isAssigning}
              onClick={handleAssign}
            >
              Assign
            </button>
          </div>
        </>
      )}

      {roleFormTarget && (
        <RoleFormModal
          channelId={channelId}
          existingRole={roleFormTarget === 'new' ? null : roleFormTarget}
          onClose={() => setRoleFormTarget(null)}
          onSaved={(savedRole) => {
            setRoles((prev) => {
              const exists = prev.some((r) => r.role_id === savedRole.role_id);
              return exists
                ? prev.map((r) => (r.role_id === savedRole.role_id ? savedRole : r))
                : [...prev, savedRole];
            });
          }}
        />
      )}
    </Modal>
  );
};
