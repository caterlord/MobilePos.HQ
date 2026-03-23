import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Button,
  UnstyledButton,
  Grid,
  Badge,
  Anchor,
  ActionIcon,
  SimpleGrid,
} from '@mantine/core'
import {
  IconChevronDown,
  IconInfoCircle,
  IconX,
  IconPlus,
  IconEdit,
  IconSparkles,
} from '@tabler/icons-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useAuth } from '../contexts/AuthContext'

// Mock data for charts
const realtimeData = [
  { time: '00:00', value: 0 },
  { time: '04:00', value: 5000 },
  { time: '08:00', value: 12000 },
  { time: '12:00', value: 18000 },
  { time: '16:00', value: 8000 },
  { time: '20:00', value: 3000 },
  { time: '23:59', value: 0 },
]

const weeklyData = [
  { date: '25 Sept', current: 15000, previous: 12000 },
  { date: '26 Sept', current: 22000, previous: 18000 },
  { date: '27 Sept', current: 18000, previous: 16000 },
  { date: '28 Sept', current: 25000, previous: 20000 },
  { date: '29 Sept', current: 30000, previous: 25000 },
  { date: '30 Sept', current: 28000, previous: 22000 },
  { date: '1 Oct', current: 35000, previous: 28000 },
]

export function DashboardPage() {
  useAuth();

  return (
    <Box>
      {/* Today Section */}
      <Box p="xl" style={{ backgroundColor: 'white', borderBottom: '1px solid #E3E8EE' }}>
        <Container size="xl">
          <Title order={1} size={28} fw={600} mb="xl">
            Today
          </Title>

          <Grid gutter="xl">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Paper
                p="xl"
                radius="md"
                style={{
                  border: '1px solid #E3E8EE',
                  backgroundColor: 'white',
                }}
              >
                <Group justify="space-between" mb="xl">
                  <Stack gap={4}>
                    <Group gap="xs">
                      <Text size="sm" c="dimmed" fw={500}>
                        Gross volume
                      </Text>
                      <IconChevronDown size={14} style={{ color: '#697386' }} />
                    </Group>
                    <Title order={2} size={32} fw={600}>
                      HK$0.00
                    </Title>
                    <Text size="xs" c="dimmed">
                      00:28
                    </Text>
                  </Stack>

                  <Stack gap={4} align="flex-end">
                    <Group gap="xs">
                      <Text size="sm" c="dimmed" fw={500}>
                        Yesterday
                      </Text>
                      <IconChevronDown size={14} style={{ color: '#697386' }} />
                    </Group>
                    <Text size="lg" fw={600} c="dimmed">
                      HK$30,355.70
                    </Text>
                  </Stack>
                </Group>

                {/* Realtime Chart */}
                <Box style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={realtimeData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5469D4" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#5469D4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12, fill: '#697386' }}
                        axisLine={{ stroke: '#E3E8EE' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#697386' }}
                        axisLine={{ stroke: '#E3E8EE' }}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#5469D4"
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
                <Text size="xs" c="dimmed" ta="right" mt="xs">
                  23:59
                </Text>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Stack gap="md">
                {/* HKD Balance Card */}
                <Paper
                  p="lg"
                  radius="md"
                  style={{
                    border: '1px solid #E3E8EE',
                    backgroundColor: 'white',
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500} c="dimmed">
                      HKD balance
                    </Text>
                    <Anchor size="xs" c="indigo">
                      View
                    </Anchor>
                  </Group>
                  <Title order={3} size={24} fw={600} mb={4}>
                    HK$2,152.65
                  </Title>
                  <Text size="xs" c="dimmed">
                    Estimated future payouts
                  </Text>
                </Paper>

                {/* Payouts Card */}
                <Paper
                  p="lg"
                  radius="md"
                  style={{
                    border: '1px solid #E3E8EE',
                    backgroundColor: 'white',
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500} c="dimmed">
                      Payouts
                    </Text>
                    <Anchor size="xs" c="indigo">
                      View
                    </Anchor>
                  </Group>
                  <Title order={3} size={24} fw={600} mb={4}>
                    HK$7,496.28
                  </Title>
                  <Text size="xs" c="dimmed">
                    Expected tomorrow
                  </Text>
                </Paper>

                {/* Recommendation Banner */}
                <Paper
                  p="md"
                  radius="md"
                  style={{
                    border: '1px solid #E3E8EE',
                    backgroundColor: '#F6F9FC',
                    position: 'relative',
                  }}
                >
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    style={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                  <Group gap="xs" mb="sm">
                    <IconSparkles size={16} style={{ color: '#5469D4' }} />
                    <Text size="xs" fw={600} c="indigo">
                      Recommendation
                    </Text>
                  </Group>
                  <Text size="sm" fw={600} mb="xs">
                    Save time and effort with Stripe Invoicing
                  </Text>
                  <Text size="xs" c="dimmed" mb="md">
                    Generate invoices, get paid, and manage revenue insights, all in one place.
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    style={{
                      backgroundColor: 'white',
                      color: '#5469D4',
                      border: '1px solid #E3E8EE',
                    }}
                  >
                    Try Invoicing
                  </Button>
                </Paper>
              </Stack>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      {/* Your Overview Section */}
      <Box p="xl">
        <Container size="xl">
          <Group justify="space-between" mb="xl">
            <Title order={1} size={28} fw={600}>
              Your overview
            </Title>

            <Group gap="sm">
              <Button
                variant="default"
                size="sm"
                leftSection={<IconPlus size={16} />}
                style={{
                  border: '1px solid #E3E8EE',
                }}
              >
                Add
              </Button>
              <Button
                variant="default"
                size="sm"
                leftSection={<IconEdit size={16} />}
                style={{
                  border: '1px solid #E3E8EE',
                }}
              >
                Edit
              </Button>
            </Group>
          </Group>

          {/* Sticky Filter Toolbar */}
          <Box
            style={{
              position: 'sticky',
              top: 60,
              zIndex: 100,
              backgroundColor: '#F6F9FC',
              paddingBottom: 24,
              marginBottom: 24,
            }}
          >
            <Group gap="sm">
            <UnstyledButton
              px="md"
              py="xs"
              style={{
                border: '1px solid #E3E8EE',
                borderRadius: 6,
                backgroundColor: 'white',
              }}
            >
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Date range
                </Text>
                <Text size="xs" fw={500}>
                  •
                </Text>
                <Text size="xs" fw={500}>
                  Last 7 days
                </Text>
                <IconChevronDown size={14} />
              </Group>
            </UnstyledButton>

            <UnstyledButton
              px="md"
              py="xs"
              style={{
                border: '1px solid #E3E8EE',
                borderRadius: 6,
                backgroundColor: 'white',
              }}
            >
              <Group gap="xs">
                <Text size="xs" fw={500}>
                  Daily
                </Text>
                <IconChevronDown size={14} />
              </Group>
            </UnstyledButton>

            <UnstyledButton
              px="md"
              py="xs"
              style={{
                border: '1px solid #E3E8EE',
                borderRadius: 6,
                backgroundColor: 'white',
              }}
            >
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Compare
                </Text>
                <Text size="xs" fw={500}>
                  •
                </Text>
                <Text size="xs" fw={500}>
                  Previous period
                </Text>
                <IconChevronDown size={14} />
                <ActionIcon size="xs" variant="subtle">
                  <IconX size={12} />
                </ActionIcon>
              </Group>
            </UnstyledButton>
            </Group>
          </Box>

          {/* Stats Cards Grid */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {/* Payments Card */}
            <Paper
              p="xl"
              radius="md"
              style={{
                border: '1px solid #E3E8EE',
                backgroundColor: 'white',
              }}
            >
              <Group justify="space-between" mb="xl">
                <Group gap="xs">
                  <Text size="lg" fw={600}>
                    Payments
                  </Text>
                  <ActionIcon size="sm" variant="subtle" color="gray">
                    <IconInfoCircle size={16} />
                  </ActionIcon>
                </Group>
              </Group>

              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#5469D4',
                      }}
                    />
                    <Text size="sm" c="dimmed">
                      Succeeded
                    </Text>
                  </Group>
                  <Text size="sm" fw={600}>
                    HK$111,262.40
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#A8B4C7',
                      }}
                    />
                    <Text size="sm" c="dimmed">
                      Uncaptured
                    </Text>
                  </Group>
                  <Text size="sm" fw={600}>
                    HK$0.00
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#87BBFD',
                      }}
                    />
                    <Text size="sm" c="dimmed">
                      Refunded
                    </Text>
                  </Group>
                  <Text size="sm" fw={600}>
                    HK$0.00
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#E25950',
                      }}
                    />
                    <Text size="sm" c="dimmed">
                      Failed
                    </Text>
                  </Group>
                  <Text size="sm" fw={600}>
                    HK$192.00
                  </Text>
                </Group>

                <Group justify="space-between" mt="md">
                  <Text size="xs" c="dimmed">
                    Updated yesterday
                  </Text>
                  <Anchor size="xs" c="indigo">
                    View more
                  </Anchor>
                </Group>
              </Stack>
            </Paper>

            {/* Gross Volume Chart Card */}
            <Paper
              p="xl"
              radius="md"
              style={{
                border: '1px solid #E3E8EE',
                backgroundColor: 'white',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text size="lg" fw={600}>
                      Gross volume
                    </Text>
                    <ActionIcon size="sm" variant="subtle" color="gray">
                      <IconInfoCircle size={16} />
                    </ActionIcon>
                  </Group>
                </Group>

                <Box>
                  <Group gap="sm" mb="xs">
                    <Title order={2} size={28} fw={600}>
                      HK$142K
                    </Title>
                    <Badge
                      size="sm"
                      variant="light"
                      style={{
                        backgroundColor: '#D4F4DD',
                        color: '#0E6027',
                      }}
                    >
                      +15.9%
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    HK$122K previous period
                  </Text>
                </Box>

                {/* Weekly Chart */}
                <Box style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#697386' }}
                        axisLine={{ stroke: '#E3E8EE' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#697386' }}
                        axisLine={{ stroke: '#E3E8EE' }}
                        tickFormatter={(value) => `HK$${value / 1000}K`}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="current"
                        stroke="#5469D4"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="previous"
                        stroke="#A8B4C7"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>

                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Updated 00:27
                  </Text>
                  <Anchor size="xs" c="indigo">
                    View more
                  </Anchor>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  )
}
