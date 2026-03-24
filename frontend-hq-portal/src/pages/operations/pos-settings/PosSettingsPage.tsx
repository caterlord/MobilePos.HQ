import {
  Box,
  Container,
  Title,
  Text,
  Card,
  SimpleGrid,
  UnstyledButton,
  ThemeIcon,
  Group,
  Stack,
} from '@mantine/core';
import {
  IconWallet,
  IconReceiptTax,
  IconBoxSeam,
  IconFileInvoice,
  IconUsers,
  IconChevronRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    id: 'payment-methods',
    label: 'Payment Methods',
    icon: IconWallet,
    color: 'blue',
    description: 'Configure POS payment methods, cash drawer, tips, and surcharge settings',
    path: '/pos-settings/payment-methods',
  },
  {
    id: 'tax-surcharge',
    label: 'Tax & Surcharge',
    icon: IconReceiptTax,
    color: 'teal',
    description: 'Manage taxation rules and service charge configurations',
    path: '/pos-settings/tax-surcharge',
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: IconBoxSeam,
    color: 'grape',
    description: 'Organize items by department, sub-department, and revenue center',
    path: '/pos-settings/departments',
  },
  {
    id: 'reasons',
    label: 'Reasons',
    icon: IconFileInvoice,
    color: 'orange',
    description: 'Define reasons for voids, pay-ins, pay-outs, and item sold-out',
    path: '/pos-settings/reasons',
  },
  {
    id: 'pos-users',
    label: 'POS Users',
    icon: IconUsers,
    color: 'indigo',
    description: 'Manage POS user accounts, user groups, and login methods',
    path: '/pos-settings/pos-users',
  },
];

export function PosSettingsPage() {
  const navigate = useNavigate();

  return (
    <Box>
      <Box pt="xl" px="xl" pb="lg" style={{ backgroundColor: 'white' }}>
        <Container size="xl">
          <Box mb="xl">
            <Title order={1} size={28} fw={600}>
              POS Settings
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Configure point-of-sale payment, tax, department, and user settings
            </Text>
          </Box>
        </Container>
      </Box>

      <Box p="xl" style={{ backgroundColor: '#F6F9FC', minHeight: 'calc(100vh - 200px)' }}>
        <Container size="xl">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <UnstyledButton
                    key={section.id}
                    onClick={() => navigate(section.path)}
                    style={{ display: 'block' }}
                  >
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      style={{
                        border: '1px solid #E3E8EE',
                        backgroundColor: 'white',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                      }}
                    >
                      <Group justify="space-between" mb="md">
                        <ThemeIcon size="xl" radius="md" variant="light" color={section.color}>
                          <Icon size={24} />
                        </ThemeIcon>
                        <IconChevronRight size={20} style={{ color: '#697386' }} />
                      </Group>

                      <Title order={3} size={18} fw={600} mb={8}>
                        {section.label}
                      </Title>

                      <Text size="sm" c="dimmed">
                        {section.description}
                      </Text>
                    </Card>
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
