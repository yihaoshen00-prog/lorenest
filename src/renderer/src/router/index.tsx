import { createHashRouter } from 'react-router-dom'
import { LaunchPage }       from '../pages/Launch'
import { WorkspacePage }    from '../pages/Workspace'
import { EntityDetailPage } from '../pages/EntityDetail'
import { DatabasePage }     from '../pages/Database'
import { GraphPage }        from '../pages/Graph'
import { SettingsPage }     from '../pages/Settings'
import { TimelinePage }     from '../pages/Timeline'
import { StatsPage }        from '../pages/Stats'
import { AppShell }         from '../components/layout/AppShell'

/**
 * 路由结构：
 *   /                 → LaunchPage   (启动页：最近仓库 / 新建 / 导入)
 *   /vault/:vaultId   → AppShell     (主工作台外壳)
 *     workspace       → WorkspacePage
 *     entity/:nodeId  → EntityDetailPage
 *     db/:type        → DatabasePage
 *     graph           → GraphPage
 *     settings        → SettingsPage
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <LaunchPage />,
  },
  {
    path: '/vault/:vaultId',
    element: <AppShell />,
    children: [
      { index: true,             element: <WorkspacePage /> },
      { path: 'workspace',       element: <WorkspacePage /> },
      { path: 'entity/:nodeId',  element: <EntityDetailPage /> },
      { path: 'db/:type',        element: <DatabasePage /> },
      { path: 'graph',           element: <GraphPage /> },
      { path: 'timeline',        element: <TimelinePage /> },
      { path: 'stats',           element: <StatsPage /> },
      { path: 'settings',        element: <SettingsPage /> },
    ],
  },
])
