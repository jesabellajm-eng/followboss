import { LayoutDashboard, List, PlusCircle, BarChart3, Sun, Zap, CalendarDays, Receipt, UserPlus, Mic } from 'lucide-react';
import { logoSrc } from '../assets/logo';
import type { Page } from '../types';

interface NavBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  urgentCount?: number;
  devisCount?: number;
  prospectCount?: number;
  invoiceCount?: number;
}

const navItems: { page: Page; label: string; icon: typeof LayoutDashboard; highlight?: boolean }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'list', label: 'Relances', icon: List },
  { page: 'add', label: 'Nouveau', icon: PlusCircle },
  { page: 'reports', label: 'Rapports', icon: BarChart3 },
  { page: 'morning-brief', label: 'Brief', icon: Sun },
  { page: 'calendar', label: 'RDV', icon: CalendarDays },
  { page: 'invoices', label: 'Factures', icon: Receipt },
  { page: 'prospects', label: 'Prospects', icon: UserPlus },
  { page: 'serena', label: 'Serena', icon: Mic },
  { page: 'pricing', label: 'Plans', icon: Zap, highlight: true },
];

export default function NavBar({ currentPage, onNavigate, urgentCount = 0, devisCount = 0, prospectCount = 0, invoiceCount = 0 }: NavBarProps) {
  const getBadge = (page: Page): { count: number; color: string } | null => {
    if (page === 'morning-brief' && urgentCount > 0) return { count: urgentCount, color: '#ef4444' };
    if (page === 'list' && urgentCount > 0) return { count: urgentCount, color: '#f87171' };
    if (page === 'prospects' && prospectCount > 0) return { count: prospectCount, color: '#fbbf24' };
    if (page === 'invoices' && invoiceCount > 0) return { count: invoiceCount, color: '#60a5fa' };
    return null;
  };

  return (
    <div className="nav-container">
      <div className="nav-inner">
        <span className="nav-brand" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img src={logoSrc} alt="FollowBoss" style={{ height: 80, borderRadius: 10 }} />
        </span>
        {navItems.map((item) => (
          <button
            key={item.page}
            className={`nav-link${currentPage === item.page ? ' active' : ''}${item.highlight ? ' nav-highlight' : ''}`}
            onClick={() => onNavigate(item.page)}
            style={item.highlight && currentPage !== item.page ? {
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3))',
              border: '1px solid rgba(124,58,237,0.5)',
              color: '#a78bfa',
            } : { position: 'relative' as const }}
          >
            <item.icon size={20} style={{ display: 'inline', marginRight: 6, verticalAlign: -3 }} />
            {item.label}
            {(() => {
              const badge = getBadge(item.page);
              return badge ? (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: badge.color, color: '#fff',
                  fontSize: '0.65rem', fontWeight: 800,
                  minWidth: 18, height: 18, borderRadius: 9,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: `0 0 8px ${badge.color}99`,
                  animation: 'pulse 2s infinite',
                }}>
                  {badge.count}
                </span>
              ) : null;
            })()}
          </button>
        ))}
      </div>
    </div>
  );
}
