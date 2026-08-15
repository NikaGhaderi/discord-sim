import React, { useEffect, useState } from 'react';
import { Modal } from '@shared/components/Modal';
import { profileApi, PublicProfile } from '../../profile';
import { workspacesApi } from '../index';
import { PERMISSION_LABELS, ChannelMember, Role, RoleAssignment } from '../types';
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
  const [profilesById, setProfilesById] = useState<Record<number, PublicProfile>>({});
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFormTarget, setRoleFormTarget] = useState<'new' | Role | null>(null);
  const [assignUserId, setAssignUserId] = useState<number | ''>('');
  const [assignRoleId, setAssignRoleId] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = () =>
    workspacesApi
      .listRoleAssignments(channelId)
      .then(setAssignments)
      .catch(() => {
        // Non-fatal -- roles/members still render even if this list fails
        // (e.g. a transient error), rather than taking down the whole modal.
      });

  useEffect(() => {
    let cancelled = false;

    // roles/members are the core of this modal -- a failure here is fatal
    // and shown as an error. The assignments list and avatar lookups are
    // each fetched (and caught) separately so a failure in either doesn't
    // leave the whole modal stuck on "Loading roles..." forever.
    Promise.all([workspacesApi.listRoles(channelId), workspacesApi.listMembers(channelId)])
      .then(([roleList, memberList]) => {
        if (cancelled) return;
        setRoles(roleList);
        setMembers(memberList);
        setIsLoading(false);

        workspacesApi
          .listRoleAssignments(channelId)
          .then((assignmentList) => {
            if (!cancelled) setAssignments(assignmentList);
          })
          .catch(() => {
            // Non-fatal, see loadAssignments above.
          });

        profileApi
          .listPublicProfilesByIds(memberList.map((m) => m.user_id))
          .then((profiles) => {
            if (!cancelled) {
              setProfilesById(Object.fromEntries(profiles.map((p) => [p.user_id, p])));
            }
          })
          .catch(() => {
            // Non-fatal -- rows fall back to "User #<id>" without a profile.
          });
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load roles.');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const handleRemoveAssignment = async (assignment: RoleAssignment) => {
    const key = `${assignment.user_id}:${assignment.role_id}`;
    setError(null);
    setRemovingKey(key);
    try {
      await workspacesApi.removeRoleAssignment(
        channelId,
        assignment.user_id,
        assignment.role_id
      );
      setAssignments((prev) =>
        prev.filter(
          (a) => !(a.user_id === assignment.user_id && a.role_id === assignment.role_id)
        )
      );
    } catch {
      setError('Failed to remove that role from the member.');
    } finally {
      setRemovingKey(null);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (isOwnerRole(role)) return;
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setError(null);
    try {
      await workspacesApi.deleteRole(channelId, role.role_id);
      setRoles((prev) => prev.filter((r) => r.role_id !== role.role_id));
      setAssignments((prev) => prev.filter((a) => a.role_id !== role.role_id));
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
      void loadAssignments();
    } catch {
      setError('Failed to assign role.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Modal title="Manage Roles" onClose={onClose} className="modal-card--wide">
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

          <div className="sidebar-section-title" style={{ marginLeft: 0, marginTop: 20 }}>
            Roles Assigned to Members
          </div>
          {assignments.length === 0 && (
            <p className="list-row-subtitle">No roles assigned yet.</p>
          )}
          {assignments.map((assignment) => {
            const role = roles.find((r) => r.role_id === assignment.role_id);
            const member = profilesById[assignment.user_id];
            const label = member?.username ?? `User #${assignment.user_id}`;
            const key = `${assignment.user_id}:${assignment.role_id}`;
            const isOwnerAssignment = role ? isOwnerRole(role) : false;
            return (
              <div key={key} className="list-row">
                <div>
                  <div className="list-row-title">{label}</div>
                  <div className="list-row-subtitle">{role?.name ?? 'Unknown role'}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isOwnerAssignment || removingKey === key}
                  title={isOwnerAssignment ? 'The Owner role cannot be removed' : undefined}
                  onClick={() => void handleRemoveAssignment(assignment)}
                >
                  {removingKey === key ? 'Removing...' : 'Remove'}
                </button>
              </div>
            );
          })}
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
