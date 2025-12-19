import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  BarChart3,
  FileText,
  Settings,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true) // For mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  // Save to localStorage when collapsed state changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Users, label: 'Tài khoản' },
    { path: '/campaigns', icon: Megaphone, label: 'Chiến dịch' },
    { path: '/reports', icon: FileText, label: 'Báo cáo' },
    { path: '/analytics', icon: BarChart3, label: 'Phân tích' },
    { path: '/notifications', icon: Bell, label: 'Thông báo' },
    { path: '/settings', icon: Settings, label: 'Cài đặt' },
  ]

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-600">Facebook Ads Manager</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex h-full overflow-hidden">
        {/* Sidebar - Fixed */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } fixed inset-y-0 left-0 z-50 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out lg:translate-x-0 overflow-y-auto`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 lg:p-6 border-b border-gray-200 hidden lg:flex flex-shrink-0 items-center justify-between">
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-2xl font-bold text-primary-600">Facebook Ads Manager</h1>
                  <p className="text-sm text-gray-500 mt-1">Quản lý quảng cáo</p>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="w-full flex justify-center">
                  <h1 className="text-xl font-bold text-primary-600">FAM</h1>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
                title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'
                    } py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    <Icon size={20} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t border-gray-200 flex-shrink-0 hidden lg:block">
              {!sidebarCollapsed && (
                <div className="px-4 py-2 text-sm text-gray-500">
                  <p className="font-medium text-gray-700">Phiên bản 1.0.0</p>
                  <p className="text-xs mt-1">© 2024 Facebook Ads Manager</p>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="flex justify-center">
                  <p className="text-xs text-gray-500">v1.0.0</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content - with margin for fixed sidebar */}
        <main className={`flex-1 transition-all duration-300 overflow-y-auto ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}>
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default Layout

