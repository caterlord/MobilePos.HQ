import { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Stack,
  Title,
  Text,
  Group,
  Button,
  Card,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  Alert,
} from '@mantine/core';
import {
  IconBuilding,
  IconBuildingStore,
  IconUsers,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import organizationService from '../services/organizationService';
import type { OrgBrand, OrgCompany, OrgShop } from '../services/organizationService';
import { useBrands } from '../contexts/BrandContext';
import { UserAccessPanel } from '../components/organization/UserAccessPanel';

type OrgTab = 'companies' | 'brands' | 'shops' | 'users';
type EditableType = 'companies' | 'brands' | 'shops';

interface FlatBrand extends OrgBrand {
  companyId: number;
  companyName: string;
}

interface FlatShop extends OrgShop {
  brandId: number;
  brandName: string;
  companyId: number;
  companyName: string;
}

interface EditTarget {
  type: EditableType;
  id: number;
}

interface DeleteTarget {
  type: EditableType;
  id: number;
  name: string;
}

const roleColor = (role?: string | null) => {
  switch ((role || '').toLowerCase()) {
    case 'owner':
      return 'violet';
    case 'companyadmin':
    case 'company admin':
      return 'blue';
    case 'brandadmin':
    case 'brand admin':
      return 'teal';
    case 'shopmanager':
    case 'shop manager':
      return 'orange';
    default:
      return 'gray';
  }
};

export function OrganizationManagementPage() {
  const { refreshBrands } = useBrands();
  const [activeTab, setActiveTab] = useState<OrgTab>('companies');
  const [companies, setCompanies] = useState<OrgCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [parentCompanyId, setParentCompanyId] = useState<string | null>(null);
  const [parentBrandId, setParentBrandId] = useState<string | null>(null);

  const brands = useMemo<FlatBrand[]>(() => {
    return companies.flatMap((company) =>
      (company.brands || []).map((brand) => ({
        ...brand,
        companyId: company.id,
        companyName: company.name,
      }))
    );
  }, [companies]);

  const shops = useMemo<FlatShop[]>(() => {
    return brands.flatMap((brand) =>
      (brand.shops || []).map((shop) => ({
        ...shop,
        brandId: brand.id,
        brandName: brand.name,
        companyId: brand.companyId,
        companyName: brand.companyName,
      }))
    );
  }, [brands]);

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: company.id.toString(), label: company.name })),
    [companies]
  );

  const brandOptions = useMemo(
    () =>
      brands
        .filter((brand) => !parentCompanyId || brand.companyId.toString() === parentCompanyId)
        .map((brand) => ({
          value: brand.id.toString(),
          label: `${brand.name} (${brand.companyName})`,
        })),
    [brands, parentCompanyId]
  );

  const resetForm = () => {
    setName('');
    setDescription('');
    setAddress('');
    setParentCompanyId(null);
    setParentBrandId(null);
  };

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);
      const hierarchy = await organizationService.getHierarchy();
      setCompanies(hierarchy);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load organization data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  const openAddModal = () => {
    resetForm();
    setAddModalOpened(true);
  };

  const openEditModal = (target: EditTarget) => {
    resetForm();
    setEditTarget(target);

    if (target.type === 'companies') {
      const company = companies.find((item) => item.id === target.id);
      if (company) {
        setName(company.name);
        setDescription(company.description || '');
      }
    }

    if (target.type === 'brands') {
      const brand = brands.find((item) => item.id === target.id);
      if (brand) {
        setName(brand.name);
        setDescription(brand.description || '');
        setParentCompanyId(brand.companyId.toString());
      }
    }

    if (target.type === 'shops') {
      const shop = shops.find((item) => item.id === target.id);
      if (shop) {
        setName(shop.name);
        setAddress(shop.address || '');
        setParentCompanyId(shop.companyId.toString());
        setParentBrandId(shop.brandId.toString());
      }
    }

    setEditModalOpened(true);
  };

  const openDeleteModal = (target: DeleteTarget) => {
    setDeleteTarget(target);
    setDeleteModalOpened(true);
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      notifications.show({ color: 'red', message: 'Name is required' });
      return;
    }

    if (activeTab === 'users') {
      notifications.show({ color: 'yellow', message: 'User access workflows are planned for a later sprint.' });
      return;
    }

    try {
      setSubmitting(true);

      if (activeTab === 'companies') {
        await organizationService.createCompany({
          name: trimmedName,
          description: description.trim() || undefined,
        });
      }

      if (activeTab === 'brands') {
        if (!parentCompanyId) {
          notifications.show({ color: 'red', message: 'Please select a company' });
          return;
        }

        await organizationService.createBrand({
          parentId: parseInt(parentCompanyId, 10),
          name: trimmedName,
          description: description.trim() || undefined,
        });
      }

      if (activeTab === 'shops') {
        if (!parentBrandId) {
          notifications.show({ color: 'red', message: 'Please select a brand' });
          return;
        }

        await organizationService.createShop({
          parentId: parseInt(parentBrandId, 10),
          name: trimmedName,
          address: address.trim() || undefined,
        });
      }

      notifications.show({ color: 'green', message: 'Created successfully' });
      setAddModalOpened(false);
      resetForm();
      await loadHierarchy();
      await refreshBrands().catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create record';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      notifications.show({ color: 'red', message: 'Name is required' });
      return;
    }

    try {
      setSubmitting(true);

      if (editTarget.type === 'companies') {
        await organizationService.updateCompany({
          id: editTarget.id,
          name: trimmedName,
          description: description.trim() || '',
        });
      }

      if (editTarget.type === 'brands') {
        await organizationService.updateBrand({
          id: editTarget.id,
          name: trimmedName,
          description: description.trim() || '',
        });
      }

      if (editTarget.type === 'shops') {
        await organizationService.updateShop({
          id: editTarget.id,
          name: trimmedName,
          address: address.trim() || '',
        });
      }

      notifications.show({ color: 'green', message: 'Updated successfully' });
      setEditModalOpened(false);
      setEditTarget(null);
      resetForm();
      await loadHierarchy();
      await refreshBrands().catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update record';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setSubmitting(true);

      if (deleteTarget.type === 'companies') {
        await organizationService.deleteCompany(deleteTarget.id);
      }

      if (deleteTarget.type === 'brands') {
        await organizationService.deleteBrand(deleteTarget.id);
      }

      if (deleteTarget.type === 'shops') {
        await organizationService.deleteShop(deleteTarget.id);
      }

      notifications.show({ color: 'green', message: 'Deleted successfully' });
      setDeleteModalOpened(false);
      setDeleteTarget(null);
      await loadHierarchy();
      await refreshBrands().catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete record';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl" mb="xl">
        <Group justify="space-between" align="start">
          <div>
            <Title order={2}>Organization Management</Title>
            <Text size="sm" c="dimmed" mt="xs">
              Manage your companies, brands, shops, and access assignments.
            </Text>
          </div>
          {activeTab !== 'users' && (
            <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
              Add New
            </Button>
          )}
        </Group>
      </Stack>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      <Paper withBorder radius="md">
        <Tabs value={activeTab} onChange={(value) => setActiveTab((value as OrgTab) || 'companies')}>
          <Tabs.List>
            <Tabs.Tab value="companies" leftSection={<IconBuilding size={16} />}>
              Companies
            </Tabs.Tab>
            <Tabs.Tab value="brands" leftSection={<IconBuildingStore size={16} />}>
              Brands
            </Tabs.Tab>
            <Tabs.Tab value="shops" leftSection={<IconBuildingStore size={16} />}>
              Shops
            </Tabs.Tab>
            <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
              User Access
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="companies" p="xl">
            <Stack gap="lg">
              <Title order={4}>Companies</Title>
              {!loading && companies.length === 0 ? (
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  No companies found. Click "Add New" to create one.
                </Alert>
              ) : (
                companies.map((company) => (
                  <Card key={company.id} withBorder p="md">
                    <Group justify="space-between" mb="sm">
                      <Group>
                        <IconBuilding size={20} />
                        <Text fw={500}>{company.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Badge color={company.isActive ? 'green' : 'gray'}>
                          {company.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="light" color={roleColor(company.role)}>
                          {company.role || 'Member'}
                        </Badge>
                        <ActionIcon variant="light" color="blue" onClick={() => openEditModal({ type: 'companies', id: company.id })}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="red" onClick={() => openDeleteModal({ type: 'companies', id: company.id, name: company.name })}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Company ID</Text>
                        <Text size="sm">{company.id}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Brands</Text>
                        <Text size="sm">{company.brands?.length || 0}</Text>
                      </Group>
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="brands" p="xl">
            <Stack gap="lg">
              <Title order={4}>Brands</Title>
              {!loading && brands.length === 0 ? (
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  No brands found. Click "Add New" to create one under a company.
                </Alert>
              ) : (
                brands.map((brand) => (
                  <Card key={brand.id} withBorder p="md">
                    <Group justify="space-between" mb="sm">
                      <Group>
                        <IconBuildingStore size={20} />
                        <Text fw={500}>{brand.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Badge color={brand.isActive ? 'green' : 'gray'}>
                          {brand.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="light" color={roleColor(brand.role)}>
                          {brand.role || 'Inherited'}
                        </Badge>
                        <ActionIcon variant="light" color="blue" onClick={() => openEditModal({ type: 'brands', id: brand.id })}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="red" onClick={() => openDeleteModal({ type: 'brands', id: brand.id, name: brand.name })}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Company</Text>
                        <Text size="sm">{brand.companyName}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Shops</Text>
                        <Text size="sm">{brand.shops?.length || 0}</Text>
                      </Group>
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="shops" p="xl">
            <Stack gap="lg">
              <Title order={4}>Shops</Title>
              {!loading && shops.length === 0 ? (
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  No shops found. Click "Add New" to create one under a brand.
                </Alert>
              ) : (
                shops.map((shop) => (
                  <Card key={shop.id} withBorder p="md">
                    <Group justify="space-between" mb="sm">
                      <Group>
                        <IconBuildingStore size={20} />
                        <Text fw={500}>{shop.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Badge color={shop.isActive ? 'green' : 'gray'}>
                          {shop.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="light" color={roleColor(shop.role)}>
                          {shop.role || 'Inherited'}
                        </Badge>
                        <ActionIcon variant="light" color="blue" onClick={() => openEditModal({ type: 'shops', id: shop.id })}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="red" onClick={() => openDeleteModal({ type: 'shops', id: shop.id, name: shop.name })}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Company</Text>
                        <Text size="sm">{shop.companyName}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Brand</Text>
                        <Text size="sm">{shop.brandName}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Address</Text>
                        <Text size="sm">{shop.address || '-'}</Text>
                      </Group>
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="users" p="xl">
            <UserAccessPanel />
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Modal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        title={`Add New ${activeTab === 'companies' ? 'Company' : activeTab === 'brands' ? 'Brand' : activeTab === 'shops' ? 'Shop' : 'User'}`}
        size="md"
      >
        <Stack gap="md">
          {activeTab !== 'users' && (
            <TextInput
              label="Name"
              placeholder={`Enter ${activeTab === 'companies' ? 'company' : activeTab === 'brands' ? 'brand' : 'shop'} name`}
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          )}

          {activeTab === 'companies' && (
            <TextInput
              label="Description"
              placeholder="Optional description"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          )}

          {activeTab === 'brands' && (
            <>
              <Select
                label="Company"
                placeholder="Select company"
                data={companyOptions}
                value={parentCompanyId}
                onChange={(value) => setParentCompanyId(value)}
                required
              />
              <TextInput
                label="Description"
                placeholder="Optional description"
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
              />
            </>
          )}

          {activeTab === 'shops' && (
            <>
              <Select
                label="Company"
                placeholder="Select company"
                data={companyOptions}
                value={parentCompanyId}
                onChange={(value) => {
                  setParentCompanyId(value);
                  setParentBrandId(null);
                }}
                required
              />
              <Select
                label="Brand"
                placeholder="Select brand"
                data={brandOptions}
                value={parentBrandId}
                onChange={(value) => setParentBrandId(value)}
                required
                disabled={!parentCompanyId}
              />
              <TextInput
                label="Address"
                placeholder="Optional address"
                value={address}
                onChange={(event) => setAddress(event.currentTarget.value)}
              />
            </>
          )}

          {activeTab === 'users' && (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              User access creation is not enabled in this sprint.
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setAddModalOpened(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleCreate}>
              Add
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setEditTarget(null);
        }}
        title={`Edit ${editTarget?.type === 'companies' ? 'Company' : editTarget?.type === 'brands' ? 'Brand' : 'Shop'}`}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
          />

          {(editTarget?.type === 'companies' || editTarget?.type === 'brands') && (
            <TextInput
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          )}

          {editTarget?.type === 'shops' && (
            <TextInput
              label="Address"
              value={address}
              onChange={(event) => setAddress(event.currentTarget.value)}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={() => {
                setEditModalOpened(false);
                setEditTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleUpdate}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setDeleteTarget(null);
        }}
        title="Confirm Delete"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Delete <strong>{deleteTarget?.name}</strong>? This will deactivate the record and related assignments.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setDeleteModalOpened(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button color="red" loading={submitting} onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
