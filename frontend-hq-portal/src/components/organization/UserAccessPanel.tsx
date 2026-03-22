import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
import teamsService, {
  type AccessAuditLog,
  type Team,
  type TeamInvitation,
  type TeamMember,
  type TeamRoleValue,
} from '../../services/teamsService';

type TeamModalMode = 'create' | 'edit';

const roleColor = (role: TeamRoleValue) => {
  if (role === 1 || String(role).toLowerCase() === 'leader') {
    return 'blue';
  }

  return 'gray';
};

const roleLabel = (role: TeamRoleValue) => {
  if (role === 1 || String(role).toLowerCase() === 'leader') {
    return 'Leader';
  }

  return 'Member';
};

export function UserAccessPanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [accessAuditLogs, setAccessAuditLogs] = useState<AccessAuditLog[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamModalOpened, setTeamModalOpened] = useState(false);
  const [teamModalMode, setTeamModalMode] = useState<TeamModalMode>('create');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [inviteModalOpened, setInviteModalOpened] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [actionInvitationId, setActionInvitationId] = useState<string | null>(null);
  const [actionMemberUserId, setActionMemberUserId] = useState<string | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    []
  );

  const loadTeams = useCallback(async (preferredTeamId?: string | null) => {
    try {
      setLoadingTeams(true);
      setError(null);

      const teamList = await teamsService.getTeams();
      setTeams(teamList);

      const nextTeamId =
        preferredTeamId && teamList.some((team) => team.id === preferredTeamId)
          ? preferredTeamId
          : teamList[0]?.id || null;

      setSelectedTeamId(nextTeamId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load teams';
      setError(message);
      setTeams([]);
      setSelectedTeamId(null);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const loadTeamDetails = useCallback(async (teamId: string) => {
    try {
      setLoadingMembers(true);
      const [teamMembers, pendingInvitations, auditLogs] = await Promise.all([
        teamsService.getTeamMembers(teamId),
        teamsService.getPendingInvitations(teamId),
        teamsService.getAccessAuditLogs(teamId, 50),
      ]);

      setMembers(teamMembers);
      setPendingInvitations(pendingInvitations);
      setAccessAuditLogs(auditLogs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team details';
      setError(message);
      setMembers([]);
      setPendingInvitations([]);
      setAccessAuditLogs([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (!selectedTeamId) {
      setMembers([]);
      setPendingInvitations([]);
      setAccessAuditLogs([]);
      return;
    }

    loadTeamDetails(selectedTeamId);
  }, [selectedTeamId, loadTeamDetails]);

  const openCreateTeamModal = () => {
    setTeamModalMode('create');
    setTeamName('');
    setTeamDescription('');
    setTeamModalOpened(true);
  };

  const openEditTeamModal = (team: Team) => {
    setTeamModalMode('edit');
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setSelectedTeamId(team.id);
    setTeamModalOpened(true);
  };

  const handleSubmitTeam = async () => {
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      notifications.show({ color: 'red', message: 'Team name is required' });
      return;
    }

    try {
      setSubmitting(true);

      if (teamModalMode === 'create') {
        const created = await teamsService.createTeam({
          name: trimmedName,
          description: teamDescription.trim() || undefined,
        });

        notifications.show({ color: 'green', message: 'Team created successfully' });
        await loadTeams(created.id);
      } else if (selectedTeam) {
        await teamsService.updateTeam(selectedTeam.id, {
          name: trimmedName,
          description: teamDescription.trim() || undefined,
          isActive: selectedTeam.isActive,
        });

        notifications.show({ color: 'green', message: 'Team updated successfully' });
        await loadTeams(selectedTeam.id);
      }

      setTeamModalOpened(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save team';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) {
      return;
    }

    try {
      setSubmitting(true);
      await teamsService.deleteTeam(selectedTeam.id);
      notifications.show({ color: 'green', message: 'Team deleted successfully' });
      setDeleteModalOpened(false);
      await loadTeams(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete team';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const openInviteModal = () => {
    if (!selectedTeam) {
      notifications.show({ color: 'yellow', message: 'Select a team first' });
      return;
    }

    setInviteEmail('');
    setInviteRole('member');
    setInviteModalOpened(true);
  };

  const handleInviteMember = async () => {
    if (!selectedTeam) {
      return;
    }

    const email = inviteEmail.trim();
    if (!email) {
      notifications.show({ color: 'red', message: 'Email is required' });
      return;
    }

    try {
      setSubmitting(true);
      await teamsService.inviteTeamMember(selectedTeam.id, {
        email,
        role: inviteRole === 'leader' ? 1 : 0,
      });

      notifications.show({ color: 'green', message: 'Invitation sent successfully' });
      setInviteModalOpened(false);
      await loadTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!selectedTeam) {
      return;
    }

    try {
      setActionInvitationId(invitationId);
      await teamsService.resendInvitation(selectedTeam.id, invitationId);
      notifications.show({ color: 'green', message: 'Invitation resent successfully' });
      await loadTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invitation';
      notifications.show({ color: 'red', message });
    } finally {
      setActionInvitationId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!selectedTeam) {
      return;
    }

    try {
      setActionInvitationId(invitationId);
      await teamsService.cancelInvitation(selectedTeam.id, invitationId);
      notifications.show({ color: 'green', message: 'Invitation cancelled successfully' });
      await loadTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel invitation';
      notifications.show({ color: 'red', message });
    } finally {
      setActionInvitationId(null);
    }
  };

  const handleToggleMemberRole = async (member: TeamMember) => {
    if (!selectedTeam) {
      return;
    }

    const nextRole = roleLabel(member.role) === 'Leader' ? 0 : 1;

    try {
      setActionMemberUserId(member.userId);
      await teamsService.updateMemberRole(selectedTeam.id, member.userId, nextRole);
      notifications.show({ color: 'green', message: 'Member role updated successfully' });
      await loadTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update member role';
      notifications.show({ color: 'red', message });
    } finally {
      setActionMemberUserId(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!selectedTeam) {
      return;
    }

    try {
      setActionMemberUserId(member.userId);
      await teamsService.removeMember(selectedTeam.id, member.userId);
      notifications.show({ color: 'green', message: 'Member removed successfully' });
      await loadTeamDetails(selectedTeam.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      notifications.show({ color: 'red', message });
    } finally {
      setActionMemberUserId(null);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="start">
        <div>
          <Title order={4}>User Access Rights</Title>
          <Text size="sm" c="dimmed">
            Manage teams and review active members.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateTeamModal}>
          Create Team
        </Button>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      {!loadingTeams && teams.length === 0 ? (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          No teams found. Create your first team to assign access.
        </Alert>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Paper withBorder p="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600}>Teams</Text>
                {loadingTeams && <Text size="xs" c="dimmed">Refreshing...</Text>}
              </Group>
              {teams.map((team) => {
                const isSelected = team.id === selectedTeamId;
                return (
                  <Card
                    key={team.id}
                    withBorder
                    p="md"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--mantine-color-blue-6)' : undefined,
                    }}
                    onClick={() => setSelectedTeamId(team.id)}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <IconUsers size={16} />
                        <Text fw={500}>{team.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Badge color={team.isActive ? 'green' : 'gray'}>
                          {team.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditTeamModal(team);
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTeamId(team.id);
                            setDeleteModalOpened(true);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {team.description || 'No description'}
                    </Text>
                  </Card>
                );
              })}
            </Stack>
          </Paper>

          <Paper withBorder p="md">
            {selectedTeam ? (
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={5}>{selectedTeam.name}</Title>
                  <Group gap="xs">
                    <Badge variant="light">Members: {members.length}</Badge>
                    <Badge variant="light" color="orange">
                      Pending Invitations: {pendingInvitations.length}
                    </Badge>
                    <Button variant="light" size="xs" onClick={openInviteModal}>
                      Invite Member
                    </Button>
                  </Group>
                </Group>

                <Text size="sm" c="dimmed">
                  {selectedTeam.description || 'No team description.'}
                </Text>

                {loadingMembers ? (
                  <Text size="sm" c="dimmed">
                    Loading team members...
                  </Text>
                ) : members.length === 0 ? (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue">
                    No active members in this team.
                  </Alert>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Role</Table.Th>
                        <Table.Th>Joined</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {members.map((member) => {
                        const displayName = `${member.userFirstName} ${member.userLastName}`.trim() || member.userEmail || member.userId;
                        return (
                          <Table.Tr key={member.userId}>
                            <Table.Td>{displayName}</Table.Td>
                            <Table.Td>{member.userEmail || '-'}</Table.Td>
                            <Table.Td>
                              <Badge variant="light" color={roleColor(member.role)}>
                                {roleLabel(member.role)}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{dateFormatter.format(new Date(member.joinedAt))}</Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Button
                                  size="xs"
                                  variant="light"
                                  loading={actionMemberUserId === member.userId}
                                  onClick={() => handleToggleMemberRole(member)}
                                >
                                  {roleLabel(member.role) === 'Leader' ? 'Set Member' : 'Set Leader'}
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  variant="light"
                                  loading={actionMemberUserId === member.userId}
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  Remove
                                </Button>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                )}

                <Stack gap="xs">
                  <Text fw={600}>Pending Invitations</Text>
                  {pendingInvitations.length === 0 ? (
                    <Alert icon={<IconAlertCircle size={16} />} color="blue">
                      No pending invitations.
                    </Alert>
                  ) : (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Email</Table.Th>
                          <Table.Th>Role</Table.Th>
                          <Table.Th>Expires At</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {pendingInvitations.map((invitation) => (
                          <Table.Tr key={invitation.id}>
                            <Table.Td>{invitation.email}</Table.Td>
                            <Table.Td>
                              <Badge variant="light" color={roleColor(invitation.role)}>
                                {roleLabel(invitation.role)}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{dateFormatter.format(new Date(invitation.expiresAt))}</Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Button
                                  size="xs"
                                  variant="light"
                                  loading={actionInvitationId === invitation.id}
                                  onClick={() => handleResendInvitation(invitation.id)}
                                >
                                  Resend
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  variant="light"
                                  loading={actionInvitationId === invitation.id}
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                >
                                  Cancel
                                </Button>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>

                <Stack gap="xs">
                  <Text fw={600}>Access Audit Trail</Text>
                  {accessAuditLogs.length === 0 ? (
                    <Alert icon={<IconAlertCircle size={16} />} color="blue">
                      No audit events found for this team.
                    </Alert>
                  ) : (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Timestamp</Table.Th>
                          <Table.Th>Action</Table.Th>
                          <Table.Th>Actor</Table.Th>
                          <Table.Th>Target</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {accessAuditLogs.map((log) => (
                          <Table.Tr key={log.id}>
                            <Table.Td>{dateFormatter.format(new Date(log.createdAt))}</Table.Td>
                            <Table.Td>{log.actionType}</Table.Td>
                            <Table.Td>{log.actorUserId || '-'}</Table.Td>
                            <Table.Td>{log.targetEmail || log.targetUserId || '-'}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Stack>
            ) : (
              <Alert icon={<IconAlertCircle size={16} />} color="blue">
                Select a team to view details.
              </Alert>
            )}
          </Paper>
        </SimpleGrid>
      )}

      <Modal
        opened={teamModalOpened}
        onClose={() => setTeamModalOpened(false)}
        title={teamModalMode === 'create' ? 'Create Team' : 'Edit Team'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Team Name"
            placeholder="Enter team name"
            value={teamName}
            onChange={(event) => setTeamName(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Description"
            placeholder="Optional description"
            value={teamDescription}
            onChange={(event) => setTeamDescription(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setTeamModalOpened(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSubmitTeam}>
              {teamModalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title="Delete Team"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Delete <strong>{selectedTeam?.name}</strong>? This will deactivate the team and remove access for its members.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setDeleteModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={submitting} onClick={handleDeleteTeam}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={inviteModalOpened}
        onClose={() => setInviteModalOpened(false)}
        title="Invite Team Member"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Email"
            placeholder="user@example.com"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.currentTarget.value)}
            required
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(value) => setInviteRole(value || 'member')}
            data={[
              { value: 'member', label: 'Member' },
              { value: 'leader', label: 'Leader' },
            ]}
            allowDeselect={false}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setInviteModalOpened(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleInviteMember}>
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
