import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Modal,
  MultiSelect,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import posUserService from '../../../services/posUserService';
import type {
  PosUserGroupSummary,
  UpsertPosUserGroupPayload,
  PosUserSummary,
  UpsertPosUserPayload,
} from '../../../types/posUser';

const defaultGroupPayload: UpsertPosUserGroupPayload = { name: '', altName: '', enabled: true };

const defaultUserPayload: UpsertPosUserPayload = {
  userName: '',
  userAltName: '',
  password: '',
  staffCode: '',
  cardNo: '',
  shopId: 0,
  enabled: true,
  inactiveUserAccount: false,
  enableUserIdLogin: true,
  enableCardNoLogin: false,
  enableStaffCodeLogin: false,
  groupIds: [],
};

export function PosUsersPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  // ── Group state ──
  const [groups, setGroups] = useState<PosUserGroupSummary[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupModalOpened, setGroupModalOpened] = useState(false);
  const [groupDeleteOpened, setGroupDeleteOpened] = useState(false);
  const [groupEditTarget, setGroupEditTarget] = useState<PosUserGroupSummary | null>(null);
  const [groupDeleteTarget, setGroupDeleteTarget] = useState<PosUserGroupSummary | null>(null);
  const [groupPayload, setGroupPayload] = useState<UpsertPosUserGroupPayload>({ ...defaultGroupPayload });

  // ── User state ──
  const [users, setUsers] = useState<PosUserSummary[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userModalOpened, setUserModalOpened] = useState(false);
  const [userDeleteOpened, setUserDeleteOpened] = useState(false);
  const [userEditTarget, setUserEditTarget] = useState<PosUserSummary | null>(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState<PosUserSummary | null>(null);
  const [userPayload, setUserPayload] = useState<UpsertPosUserPayload>({ ...defaultUserPayload });
  const [filterShopId, setFilterShopId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // ── Shop options (derived from user list) ──
  const shopOptions = useMemo(() => {
    const seen = new Map<number, string>();
    users.forEach((u) => { if (!seen.has(u.shopId)) seen.set(u.shopId, u.shopName); });
    return Array.from(seen.entries()).map(([id, name]) => ({ value: String(id), label: name || `Shop ${id}` }));
  }, [users]);

  // ── Group options (for MultiSelect in user editor) ──
  const groupOptions = useMemo(() =>
    groups.map((g) => ({ value: String(g.groupId), label: g.name })),
  [groups]);

  // ── Loaders ──

  const loadGroups = useCallback(async () => {
    if (!brandId) { setGroups([]); return; }
    try {
      setGroupLoading(true);
      setGroups(await posUserService.listGroups(brandId));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load groups' });
    } finally {
      setGroupLoading(false);
    }
  }, [brandId]);

  const loadUsers = useCallback(async () => {
    if (!brandId) { setUsers([]); return; }
    try {
      setUserLoading(true);
      const sid = filterShopId ? parseInt(filterShopId, 10) : undefined;
      setUsers(await posUserService.listUsers(brandId, sid));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load users' });
    } finally {
      setUserLoading(false);
    }
  }, [brandId, filterShopId]);

  useEffect(() => { void loadGroups(); }, [loadGroups]);
  useEffect(() => { void loadUsers(); }, [loadUsers]);

  // ── Group handlers ──

  const openGroupCreate = () => { setGroupEditTarget(null); setGroupPayload({ ...defaultGroupPayload }); setGroupModalOpened(true); };
  const openGroupEdit = (g: PosUserGroupSummary) => {
    setGroupEditTarget(g);
    setGroupPayload({ name: g.name, altName: g.altName, enabled: g.enabled });
    setGroupModalOpened(true);
  };

  const handleGroupSave = async () => {
    if (!brandId) return;
    if (!groupPayload.name.trim()) { notifications.show({ color: 'red', message: 'Group name is required' }); return; }
    try {
      setSubmitting(true);
      const req = { ...groupPayload, name: groupPayload.name.trim(), altName: groupPayload.altName.trim() };
      if (groupEditTarget) {
        await posUserService.updateGroup(brandId, groupEditTarget.groupId, req);
        notifications.show({ color: 'green', message: 'Group updated' });
      } else {
        await posUserService.createGroup(brandId, req);
        notifications.show({ color: 'green', message: 'Group created' });
      }
      setGroupModalOpened(false);
      await loadGroups();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroupDeactivate = async () => {
    if (!brandId || !groupDeleteTarget) return;
    try {
      setSubmitting(true);
      await posUserService.deactivateGroup(brandId, groupDeleteTarget.groupId);
      notifications.show({ color: 'green', message: 'Group deactivated' });
      setGroupDeleteOpened(false);
      await loadGroups();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to deactivate' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── User handlers ──

  const openUserCreate = () => { setUserEditTarget(null); setUserPayload({ ...defaultUserPayload }); setUserModalOpened(true); };
  const openUserEdit = (u: PosUserSummary) => {
    setUserEditTarget(u);
    setUserPayload({
      userName: u.userName,
      userAltName: u.userAltName ?? '',
      password: '',
      staffCode: u.staffCode ?? '',
      cardNo: u.cardNo ?? '',
      shopId: u.shopId,
      enabled: u.enabled,
      inactiveUserAccount: u.inactiveUserAccount,
      enableUserIdLogin: u.enableUserIdLogin,
      enableCardNoLogin: u.enableCardNoLogin,
      enableStaffCodeLogin: u.enableStaffCodeLogin,
      groupIds: u.groupIds ?? [],
    });
    setUserModalOpened(true);
  };

  const handleUserSave = async () => {
    if (!brandId) return;
    if (!userPayload.userName.trim()) { notifications.show({ color: 'red', message: 'User name is required' }); return; }
    if (!userEditTarget && !userPayload.password) { notifications.show({ color: 'red', message: 'Password is required for new users' }); return; }
    if (userPayload.shopId <= 0) { notifications.show({ color: 'red', message: 'Shop is required' }); return; }
    try {
      setSubmitting(true);
      const req: UpsertPosUserPayload = { ...userPayload, userName: userPayload.userName.trim() };
      if (userEditTarget) {
        await posUserService.updateUser(brandId, userEditTarget.userId, userEditTarget.shopId, req);
        notifications.show({ color: 'green', message: 'User updated' });
      } else {
        await posUserService.createUser(brandId, req);
        notifications.show({ color: 'green', message: 'User created' });
      }
      setUserModalOpened(false);
      await loadUsers();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserDeactivate = async () => {
    if (!brandId || !userDeleteTarget) return;
    try {
      setSubmitting(true);
      await posUserService.deactivateUser(brandId, userDeleteTarget.userId, userDeleteTarget.shopId);
      notifications.show({ color: 'green', message: 'User deactivated' });
      setUserDeleteOpened(false);
      await loadUsers();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to deactivate' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={2}>POS Users</Title>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage POS users.
          </Alert>
        )}

        <Tabs defaultValue="groups">
          <Tabs.List>
            <Tabs.Tab value="groups">User Groups</Tabs.Tab>
            <Tabs.Tab value="users">POS Users</Tabs.Tab>
          </Tabs.List>

          {/* ── User Groups Tab ── */}
          <Tabs.Panel value="groups" pt="md">
            <Stack gap="md">
              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => void loadGroups()} loading={groupLoading}>Refresh</Button>
                <Button leftSection={<IconPlus size={16} />} onClick={openGroupCreate} disabled={!brandId}>New User Group</Button>
              </Group>
              <Paper withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Group ID</Table.Th>
                      <Table.Th>Group Name</Table.Th>
                      <Table.Th>Alt Name</Table.Th>
                      <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {groups.length === 0 ? (
                      <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">{groupLoading ? 'Loading...' : 'No user groups found.'}</Text></Table.Td></Table.Tr>
                    ) : groups.map((g) => (
                      <Table.Tr key={g.groupId}>
                        <Table.Td>{g.groupId}</Table.Td>
                        <Table.Td>{g.name}</Table.Td>
                        <Table.Td>{g.altName || '—'}</Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon variant="subtle" color="blue" onClick={() => openGroupEdit(g)}><IconEdit size={16} /></ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => { setGroupDeleteTarget(g); setGroupDeleteOpened(true); }}><IconTrash size={16} /></ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* ── POS Users Tab ── */}
          <Tabs.Panel value="users" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Select label="Filter by Shop" placeholder="All shops" clearable data={shopOptions}
                  value={filterShopId} onChange={setFilterShopId} w={250} />
                <Group>
                  <Button variant="subtle" onClick={() => void loadUsers()} loading={userLoading}>Refresh</Button>
                  <Button leftSection={<IconPlus size={16} />} onClick={openUserCreate} disabled={!brandId}>New User</Button>
                </Group>
              </Group>
              <Paper withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>User Name</Table.Th>
                      <Table.Th>Staff Code</Table.Th>
                      <Table.Th>Card No</Table.Th>
                      <Table.Th>Shop</Table.Th>
                      <Table.Th>Groups</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {users.length === 0 ? (
                      <Table.Tr><Table.Td colSpan={7}><Text c="dimmed" ta="center" py="md">{userLoading ? 'Loading...' : 'No users found.'}</Text></Table.Td></Table.Tr>
                    ) : users.map((u) => (
                      <Table.Tr key={`${u.userId}-${u.shopId}`}>
                        <Table.Td>{u.userName}</Table.Td>
                        <Table.Td>{u.staffCode || '—'}</Table.Td>
                        <Table.Td>{u.cardNo || '—'}</Table.Td>
                        <Table.Td>{u.shopName}</Table.Td>
                        <Table.Td>
                          {u.groupNames?.length > 0
                            ? <Group gap={4}>{u.groupNames.map((name, i) => <Badge key={i} size="sm" variant="light">{name}</Badge>)}</Group>
                            : '—'}
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" color={u.inactiveUserAccount ? 'red' : 'green'}>
                            {u.inactiveUserAccount ? 'Inactive' : 'Active'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon variant="subtle" color="blue" onClick={() => openUserEdit(u)}><IconEdit size={16} /></ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => { setUserDeleteTarget(u); setUserDeleteOpened(true); }}><IconTrash size={16} /></ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* ── Group Modal ── */}
      <Modal opened={groupModalOpened} onClose={() => setGroupModalOpened(false)} title={groupEditTarget ? 'Edit User Group' : 'New User Group'} size="md">
        <Stack gap="md">
          <TextInput label="Group Name" maxLength={50} required value={groupPayload.name}
            onChange={(e) => setGroupPayload({ ...groupPayload, name: e.currentTarget.value })} />
          <TextInput label="Alt Name" maxLength={100} value={groupPayload.altName}
            onChange={(e) => setGroupPayload({ ...groupPayload, altName: e.currentTarget.value })} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setGroupModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleGroupSave()} loading={submitting}>{groupEditTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={groupDeleteOpened} onClose={() => setGroupDeleteOpened(false)} title="Deactivate User Group" size="sm">
        <Stack gap="md">
          <Text>Deactivate <strong>{groupDeleteTarget?.name}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setGroupDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleGroupDeactivate()} loading={submitting}>Deactivate</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── User Modal ── */}
      <Modal opened={userModalOpened} onClose={() => setUserModalOpened(false)} title={userEditTarget ? 'Edit POS User' : 'New POS User'} size="lg">
        <Stack gap="md">
          <Group grow>
            <TextInput label="User Name" maxLength={50} required value={userPayload.userName}
              onChange={(e) => setUserPayload({ ...userPayload, userName: e.currentTarget.value })} />
            <TextInput label="Alt Name" maxLength={50} value={userPayload.userAltName ?? ''}
              onChange={(e) => setUserPayload({ ...userPayload, userAltName: e.currentTarget.value || null })} />
          </Group>
          <Group grow>
            <TextInput label="Staff Code" maxLength={50} value={userPayload.staffCode ?? ''}
              onChange={(e) => setUserPayload({ ...userPayload, staffCode: e.currentTarget.value || null })} />
            <TextInput label="Card No" maxLength={50} value={userPayload.cardNo ?? ''}
              onChange={(e) => setUserPayload({ ...userPayload, cardNo: e.currentTarget.value || null })} />
          </Group>
          <PasswordInput label={userEditTarget ? 'Password (leave blank to keep current)' : 'Password'} required={!userEditTarget}
            value={userPayload.password}
            onChange={(e) => setUserPayload({ ...userPayload, password: e.currentTarget.value })} />
          {groupOptions.length > 0 && (
            <MultiSelect
              label="User Groups"
              placeholder="Select groups"
              data={groupOptions}
              value={(userPayload.groupIds ?? []).map(String)}
              onChange={(vals) => setUserPayload({ ...userPayload, groupIds: vals.map(Number) })}
              searchable
              clearable
            />
          )}
          {shopOptions.length > 0 && (
            <Select label="Shop" required data={shopOptions}
              value={userPayload.shopId > 0 ? String(userPayload.shopId) : null}
              onChange={(val) => setUserPayload({ ...userPayload, shopId: val ? parseInt(val, 10) : 0 })} />
          )}
          {shopOptions.length === 0 && !userEditTarget && (
            <TextInput label="Shop ID" required type="number" value={userPayload.shopId || ''}
              onChange={(e) => setUserPayload({ ...userPayload, shopId: parseInt(e.currentTarget.value, 10) || 0 })} />
          )}
          <Group grow>
            <Switch label="User ID Login" checked={userPayload.enableUserIdLogin}
              onChange={(e) => setUserPayload({ ...userPayload, enableUserIdLogin: e.currentTarget.checked })} />
            <Switch label="Card No Login" checked={userPayload.enableCardNoLogin}
              onChange={(e) => setUserPayload({ ...userPayload, enableCardNoLogin: e.currentTarget.checked })} />
            <Switch label="Staff Code Login" checked={userPayload.enableStaffCodeLogin}
              onChange={(e) => setUserPayload({ ...userPayload, enableStaffCodeLogin: e.currentTarget.checked })} />
          </Group>
          <Switch label="Inactive Account" checked={userPayload.inactiveUserAccount}
            onChange={(e) => setUserPayload({ ...userPayload, inactiveUserAccount: e.currentTarget.checked })} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setUserModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleUserSave()} loading={submitting}>{userEditTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={userDeleteOpened} onClose={() => setUserDeleteOpened(false)} title="Deactivate POS User" size="sm">
        <Stack gap="md">
          <Text>Deactivate <strong>{userDeleteTarget?.userName}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setUserDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleUserDeactivate()} loading={submitting}>Deactivate</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
