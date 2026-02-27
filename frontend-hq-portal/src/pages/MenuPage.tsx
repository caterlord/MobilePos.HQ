import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Card,
  SimpleGrid,
  UnstyledButton,
  ThemeIcon,
  Anchor,
  Badge,
} from '@mantine/core'
import {
  IconCategory,
  IconTags,
  IconPackage,
  IconAdjustments,
  IconPercentage,
  IconDiscount2,
  IconChevronRight,
  IconPalette,
  IconPlus,
  IconChefHat,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

// Sub-navigation items with descriptions
const menuSections = [
  {
    id: 'categories',
    label: 'Categories',
    icon: IconCategory,
    color: 'indigo',
    description: 'Organize menu items into logical groups',
    stats: '12 categories',
    path: '/menus/categories',
  },
  {
    id: 'virtual-categories',
    label: 'Smart Categories',
    icon: IconTags,
    color: 'teal',
    description: 'Create dynamic categories based on rules',
    stats: '5 smart categories',
    path: '/menus/smart-categories',
  },
  {
    id: 'items',
    label: 'Menu Items',
    icon: IconPackage,
    color: 'blue',
    description: 'Manage all menu items and their details',
    stats: '156 items',
    path: '/menus/items',
  },
  {
    id: 'modifiers',
    label: 'Modifiers',
    icon: IconAdjustments,
    color: 'grape',
    description: 'Add-ons and customization options',
    stats: '24 modifiers',
    path: '/menus/modifiers',
  },
  {
    id: 'meal-set',
    label: 'Meal Set',
    icon: IconChefHat,
    color: 'lime',
    description: 'Bundle menu items into curated meal sets',
    stats: '2 sets',
    path: '/menus/meal-set',
  },
  {
    id: 'promotions',
    label: 'Promotions',
    icon: IconPercentage,
    color: 'orange',
    description: 'Special offers and promotional campaigns',
    stats: '3 active',
    path: '/menus/promotions',
  },
  {
    id: 'discounts',
    label: 'Discounts',
    icon: IconDiscount2,
    color: 'red',
    description: 'Discount rules and coupon management',
    stats: '8 rules',
    path: '/menus/discounts',
  },
  {
    id: 'button-styles',
    label: 'Button Styles',
    icon: IconPalette,
    color: 'violet',
    description: 'Adjust button colors to match your brand',
    stats: '4 styles',
    path: '/menus/button-styles',
  },
]

export function MenuPage() {
  const navigate = useNavigate()

  return (
    <Box>
      {/* Page Header - Non-sticky */}
      <Box
        pt="xl"
        px="xl"
        pb="lg"
        style={{
          backgroundColor: 'white',
        }}
      >
        <Container size="xl">
          {/* Page Title */}
          <Box mb="xl">
            <Title order={1} size={28} fw={600}>
              Menu Management
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Configure your menu structure, items, and pricing
            </Text>
          </Box>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Box p="xl" style={{ backgroundColor: '#F6F9FC', minHeight: 'calc(100vh - 200px)' }}>
        <Container size="xl">
          <Stack gap="xl">
            {/* Section Cards Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {menuSections.map((section) => {
                  const Icon = section.icon
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
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            borderColor: '#5469D4',
                          },
                        }}
                      >
                        <Group justify="space-between" mb="md">
                          <ThemeIcon
                            size="xl"
                            radius="md"
                            variant="light"
                            color={section.color}
                          >
                            <Icon size={24} />
                          </ThemeIcon>
                          <IconChevronRight size={20} style={{ color: '#697386' }} />
                        </Group>

                        <Title order={3} size={18} fw={600} mb={8}>
                          {section.label}
                        </Title>

                        <Text size="sm" c="dimmed" mb="md">
                          {section.description}
                        </Text>

                        <Group justify="space-between">
                          <Badge
                            size="sm"
                            variant="light"
                            color={section.color}
                            style={{ textTransform: 'none' }}
                          >
                            {section.stats}
                          </Badge>
                          <Text size="xs" c="indigo" fw={500}>
                            Manage →
                          </Text>
                        </Group>
                      </Card>
                    </UnstyledButton>
                  )
                })}
              </SimpleGrid>

              {/* Recent Activity Section */}
              <Paper p="xl" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
                <Group justify="space-between" mb="md">
                  <Title order={2} size={20} fw={600}>
                    Recent Activity
                  </Title>
                  <Anchor size="sm" c="indigo">
                    View all →
                  </Anchor>
                </Group>

                <Stack gap="sm">
                  <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <Group>
                      <ThemeIcon size="md" radius="md" variant="light" color="green">
                        <IconPlus size={16} />
                      </ThemeIcon>
                      <Box>
                        <Text size="sm" fw={500}>New item added</Text>
                        <Text size="xs" c="dimmed">Spicy Chicken Burger added to Main Courses</Text>
                      </Box>
                    </Group>
                    <Text size="xs" c="dimmed">2 hours ago</Text>
                  </Group>

                  <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <Group>
                      <ThemeIcon size="md" radius="md" variant="light" color="orange">
                        <IconPercentage size={16} />
                      </ThemeIcon>
                      <Box>
                        <Text size="sm" fw={500}>Promotion activated</Text>
                        <Text size="xs" c="dimmed">Happy Hour 20% off on selected drinks</Text>
                      </Box>
                    </Group>
                    <Text size="xs" c="dimmed">5 hours ago</Text>
                  </Group>

                  <Group justify="space-between" p="sm">
                    <Group>
                      <ThemeIcon size="md" radius="md" variant="light" color="blue">
                        <IconAdjustments size={16} />
                      </ThemeIcon>
                      <Box>
                        <Text size="sm" fw={500}>Modifier updated</Text>
                        <Text size="xs" c="dimmed">Extra cheese price changed from $2 to $2.50</Text>
                      </Box>
                    </Group>
                    <Text size="xs" c="dimmed">Yesterday</Text>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Container>
      </Box>
    </Box>
  )
}
