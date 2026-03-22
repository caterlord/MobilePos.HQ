import api from './api';

export type TeamRoleValue = number | string;

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  role: TeamRoleValue;
  joinedAt: string;
  invitedByUserId?: string | null;
  isActive: boolean;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRoleValue;
  invitationToken: string;
  invitedByUserId: string;
  createdAt: string;
  expiresAt: string;
  isAccepted: boolean;
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
}

export interface AccessAuditLog {
  id: string;
  teamId: string;
  actionType: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  details?: string | null;
  createdAt: string;
}

interface InviteResponse {
  message: string;
  invitationId: string;
  email: string;
  expiresAt: string;
}

class TeamsService {
  async getTeams(): Promise<Team[]> {
    const response = await api.get('/teams');
    return (response.data as Team[]) || [];
  }

  async getTeam(teamId: string): Promise<Team> {
    const response = await api.get(`/teams/${teamId}`);
    return response.data as Team;
  }

  async createTeam(request: { name: string; description?: string }): Promise<Team> {
    const response = await api.post('/teams', request);
    return response.data as Team;
  }

  async updateTeam(teamId: string, request: { name: string; description?: string; isActive: boolean }): Promise<Team> {
    const response = await api.put(`/teams/${teamId}`, request);
    return response as Team;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await api.delete(`/teams/${teamId}`);
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const response = await api.get(`/teams/${teamId}/members`);
    return (response.data as TeamMember[]) || [];
  }

  async getPendingInvitations(teamId: string): Promise<TeamInvitation[]> {
    const response = await api.get(`/teams/${teamId}/pending-invitations`);
    return (response.data as TeamInvitation[]) || [];
  }

  async getAccessAuditLogs(teamId: string, limit = 50): Promise<AccessAuditLog[]> {
    const response = await api.get(`/teams/${teamId}/access-audit?limit=${limit}`);
    return (response.data as AccessAuditLog[]) || [];
  }

  async updateMemberRole(teamId: string, userId: string, role: TeamRoleValue): Promise<void> {
    await api.put(`/teams/${teamId}/members/${userId}/role`, { role });
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  }

  async inviteTeamMember(teamId: string, request: { email: string; role: TeamRoleValue }): Promise<InviteResponse> {
    const response = await api.post(`/teams/${teamId}/invite`, request);
    return response.data as InviteResponse;
  }

  async resendInvitation(teamId: string, invitationId: string): Promise<void> {
    await api.post(`/teams/${teamId}/pending-invitations/${invitationId}/resend`, {});
  }

  async cancelInvitation(teamId: string, invitationId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/pending-invitations/${invitationId}`);
  }
}

export default new TeamsService();
