import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Alerts from './pages/Alerts';
import Products from './pages/Products';
import DatabaseView from './pages/DatabaseView';

const pages = {
  dashboard:  Dashboard,
  inventory:  Inventory,
  sales:      Sales,
  alerts:     Alerts,
  products:   Products,
  database:   DatabaseView,
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const Page = pages[activePage] || Dashboard;

  return (
    <div className="layout">
      <Sidebar active={activePage} onNavigate={setActivePage} />
      <div className="main-content">
        <Topbar page={activePage} />
        <main className="page-body">
          <Page key={activePage} />
        </main>
      </div>
    </div>
  );
}
