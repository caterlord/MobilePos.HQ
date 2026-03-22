import { Tabs, Box, Container } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

const menuTabs = [
  { value: 'categories', label: 'Categories', path: '/menus/categories' },
  { value: 'virtual-categories', label: 'Smart Categories', path: '/menus/smart-categories' },
  { value: 'items', label: 'Menu Items', path: '/menus/items' },
  { value: 'modifiers', label: 'Modifiers', path: '/menus/modifiers' },
  { value: 'meal-set', label: 'Meal Set', path: '/menus/meal-set' },
  { value: 'promotions', label: 'Promotions', path: '/menus/promotions' },
  { value: 'discounts', label: 'Discounts', path: '/menus/discounts' },
]

export function MenuTabNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<string | null>('categories')

  useEffect(() => {
    // Set active tab based on current path
    const currentTab = menuTabs.find(tab => tab.path === location.pathname)
    if (currentTab) {
      setActiveTab(currentTab.value)
    }
  }, [location.pathname])

  const handleTabChange = (value: string | null) => {
    if (value) {
      const tab = menuTabs.find(t => t.value === value)
      if (tab) {
        navigate(tab.path)
      }
    }
  }

  return (
    <Box
      style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #E3E8EE',
      }}
    >
      <Container size="xl">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          styles={{
            root: {
              borderBottom: 'none',
            },
            list: {
              borderBottom: 'none',
            },
            tab: {
              fontSize: 14,
              padding: '12px 16px',
              fontWeight: 400,
              color: '#697386',
              borderBottom: '2px solid transparent',
              marginBottom: '-1px',
              '&[data-active]': {
                borderBottomColor: '#5469D4',
                color: '#5469D4',
                fontWeight: 500,
              },
              '&:hover': {
                backgroundColor: 'transparent',
                color: '#5469D4',
              },
            },
          }}
        >
          <Tabs.List>
            {menuTabs.map(tab => (
              <Tabs.Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      </Container>
    </Box>
  )
}
