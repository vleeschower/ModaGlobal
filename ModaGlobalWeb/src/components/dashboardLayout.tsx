import React, { useState } from 'react';
import Sidebar from './sidebarDashboard';
import DashboardHeader from './dashboardHeader';

interface LayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-surface-container-low overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <main className={`
        flex-1 h-full overflow-y-auto transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
      `}>
        <DashboardHeader toggleSidebar={toggleSidebar} />
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;