/**
 * Site-wide route configuration for automatic breadcrumb generation
 *
 * Structure:
 * - Each route can have a label and optional children
 * - Children can be nested to any depth
 * - AutoBreadcrumb component uses this config to generate breadcrumbs based on current path
 *
 * To add a new page:
 * 1. Add the route to the appropriate section in this config
 * 2. Use <AutoBreadcrumb /> in your page component
 * 3. That's it! Breadcrumbs automatically work for all related pages
 */

export interface RouteItem {
  path: string
  label: string
  children?: RouteItem[]
}

export const ROUTE_CONFIG: RouteItem[] = [
  {
    path: '/',
    label: 'Home',
  },
  {
    path: '/pos',
    label: 'POS System',
  },
  {
    path: '/menus',
    label: 'Menu Management',
    children: [
      {
        path: '/menus/categories',
        label: 'Categories',
      },
      {
        path: '/menus/smart-categories',
        label: 'Smart Categories',
      },
      {
        path: '/menus/items',
        label: 'Menu Items',
      },
      {
        path: '/menus/modifiers',
        label: 'Modifiers',
      },
      {
        path: '/menus/meal-set',
        label: 'Meal Set',
      },
      {
        path: '/menus/promotions',
        label: 'Promotions',
      },
      {
        path: '/menus/discounts',
        label: 'Discounts',
      },
      {
        path: '/menus/button-styles',
        label: 'Button Styles',
      },
    ],
  },
  {
    path: '/organization-management',
    label: 'Organization Management',
  },
  // Add more sections here as your app grows
  // Example:
  // {
  //   path: '/reports',
  //   label: 'Reports',
  //   children: [
  //     { path: '/reports/sales', label: 'Sales Reports' },
  //     { path: '/reports/inventory', label: 'Inventory Reports' },
  //   ],
  // },
]

/**
 * Helper function to find all routes in a section (for dropdown menus)
 */
export function getRouteChildren(parentPath: string): RouteItem[] {
  const findParent = (routes: RouteItem[]): RouteItem | undefined => {
    for (const route of routes) {
      if (route.path === parentPath) return route
      if (route.children) {
        const found = findParent(route.children)
        if (found) return found
      }
    }
    return undefined
  }

  const parent = findParent(ROUTE_CONFIG)
  return parent?.children || []
}

/**
 * Helper function to build breadcrumb trail from current path
 * Returns array of RouteItems from root to current page
 *
 * Strategy: For any path, we need to check ALL top-level routes to see if
 * the path falls under them, not just direct children. This ensures Home (/)
 * is included when visiting /menus/categories.
 */
export function buildBreadcrumbTrail(currentPath: string): RouteItem[] {
  const trail: RouteItem[] = []

  function searchRoutes(routes: RouteItem[], path: string): boolean {
    for (const route of routes) {
      // Exact match - found the target
      if (route.path === path) {
        trail.push(route)
        return true
      }

      // Check if current path could be under this route
      const couldBeUnder =
        route.path === '/'
          ? path.startsWith('/') && path !== '/' // Everything under root except root itself
          : path.startsWith(route.path + '/') // Path starts with this route + /

      if (couldBeUnder) {
        trail.push(route)

        // Search in children recursively (or continue if no children)
        if (route.children && route.children.length > 0) {
          if (searchRoutes(route.children, path)) {
            return true // Found in children, keep this route in trail
          }
          // Not found in children, backtrack
          trail.pop()
        } else {
          // No children - check if any sibling has the path
          // If not found later, this will be popped by parent
          continue
        }
      }
    }
    return false
  }

  // Always start with full config to check all top-level routes
  searchRoutes(ROUTE_CONFIG, currentPath)
  return trail
}
