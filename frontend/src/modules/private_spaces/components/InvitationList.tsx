import React, { useState } from 'react';
import { Invitation } from '../types';

interface InvitationListProps {
  initialInvitations?: Invitation[];
}

const defaultInvitations: Invitation[] = [
  { id: 'inv-1', group_name: 'Backend Devs', invited_by: 'nika_lead', created_at: '2 hours ago' },
  { id: 'inv-2', group_name: 'Gaming Lounge', invited_by: 'alex99', created_at: '1 day ago' },
];

export const InvitationList: React.FC<InvitationListProps> = ({
  initialInvitations = defaultInvitations,
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);

  const handleAccept = (id: string) => {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
  };

  const handleDecline = (id: string) => {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <div className="invitation-list-container">
      <h3>Pending Group Invitations</h3>
      {invitations.length === 0 ? (
        <p>No pending invitations.</p>
      ) : (
        <ul className="invitation-list">
          {invitations.map((inv) => (
            <li key={inv.id} className="invitation-item">
              <div>
                <strong>{inv.group_name}</strong>
                <p>Invited by @{inv.invited_by} ({inv.created_at})</p>
              </div>
              <div className="invitation-actions">
                <button onClick={() => handleAccept(inv.id)} className="btn-accept">
                  Accept
                </button>
                <button onClick={() => handleDecline(inv.id)} className="btn-decline">
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};