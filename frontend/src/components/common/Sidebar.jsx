import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  BarChart2, 
  Database, 
  FileText, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />
    },
    {
      path: '/analysis',
      label: 'Analysis',
      icon: <BarChart2 className="h-5 w-5" />
    },
    {
      path: '/historical',
      label: 'Historical Data',
      icon: <Database className="h-5 w-5" />
    },
    {
      path: '/templates',
      label: 'Templates',
      icon: <FileText className="h-5 w-5" />
    },
    {
      path: '/configuration',
      label: 'Configuration',
      icon: <Settings className="h-5 w-5" />
    }
  ];
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const handleNavigation = (path) => {
    navigate(path);
  };
  
  const handleNewAnalysis = () => {
    // Navigate to dashboard with a parameter to open the upload modal
    navigate('/dashboard?action=new-analysis');
  };
  
  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <BarChart2 className="h-8 w-8 text-blue-600" />
            {!collapsed && (
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-800">Customer Analysis</h1>
                <p className="text-xs text-gray-500">Dashboard v2.0</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
      
      {/* Collapse button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 hover:bg-gray-100 border-b border-gray-200"
        >
          <ChevronRight className="h-5 w-5 text-gray-500 mx-auto" />
        </button>
      )}
      
      {/* New Analysis Button */}
      <div className="p-4">
        <button
          onClick={handleNewAnalysis}
          className={`w-full bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center ${
            collapsed ? 'p-2' : 'px-4 py-2'
          }`}
        >
          <Upload className="h-5 w-5" />
          {!collapsed && <span className="ml-2">New Analysis</span>}
        </button>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <button
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center rounded-md transition-colors ${
                  collapsed ? 'p-2 justify-center' : 'px-3 py-2'
                } ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={collapsed ? item.label : ''}
              >
                <div className={isActive(item.path) ? 'text-blue-600' : 'text-gray-500'}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Bottom Section */}
      <div className="border-t border-gray-200 p-4">
        <button
          className={`w-full flex items-center text-gray-700 hover:bg-gray-100 rounded-md transition-colors ${
            collapsed ? 'p-2 justify-center' : 'px-3 py-2'
          }`}
          title={collapsed ? 'Help & Support' : ''}
        >
          <HelpCircle className="h-5 w-5 text-gray-500" />
          {!collapsed && <span className="ml-3 text-sm">Help & Support</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
