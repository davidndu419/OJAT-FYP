import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {jsPDF} from 'jspdf';
import {
  AlertTriangle,
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudCog as CloudRefresh,
  Download,
  Eye,
  EyeOff,
  History,
  Layers,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  Minus,
  Package,
  PackagePlus,
  PieChart as PieChartIcon,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Wifi,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './tradeease.css';

const NAIRA = String.fromCharCode(8358);

/* ═══════ Date helpers ═══════ */
const pad = n => String(n).padStart(2, '0');
const toISO = d =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const NOW = new Date();
const today = toISO(NOW);
const yesterday = toISO(
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1),
);
const twoDaysAgo = toISO(
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 2),
);
const lastMonthDay1 = toISO(new Date(NOW.getFullYear(), NOW.getMonth() - 1, 8));
const lastMonthDay2 = toISO(
  new Date(NOW.getFullYear(), NOW.getMonth() - 1, 12),
);
const lastMonthDay3 = toISO(
  new Date(NOW.getFullYear(), NOW.getMonth() - 1, 20),
);

const getToday = () => toISO(new Date());
const getCurrentTime = () =>
  new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const getYesterday = () => {
  const now = new Date();
  return toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
};

function getMonthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {start: toISO(start), end: toISO(end)};
}

function getWeekRange(d = new Date()) {
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return {start: toISO(mon), end: toISO(sun)};
}

function getLastMonthRange(d = new Date()) {
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return getMonthRange(prev);
}

function isInRange(dateStr, start, end) {
  return dateStr >= start && dateStr <= end;
}

function calcChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0
      ? {percent: 100, direction: 'up'}
      : {percent: 0, direction: 'flat'};
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return {
    percent: Math.abs(Math.round(pct * 10) / 10),
    direction: pct >= 0 ? 'up' : 'down',
  };
}

function getMonthName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleString('en-US', {month: 'long'});
}

function getFilterLabel(filter) {
  if (filter.preset === 'today') {
    return 'Today';
  }
  if (filter.preset === 'week') {
    return 'This Week';
  }
  if (filter.preset === 'month') {
    return getMonthName(filter.start);
  }
  if (filter.preset === 'custom') {
    return `${filter.start.slice(5)} – ${filter.end.slice(5)}`;
  }
  return 'Today';
}

function makeDateFilter(preset) {
  if (preset === 'today') {
    return {preset, start: today, end: today, label: 'Today'};
  }
  if (preset === 'week') {
    const r = getWeekRange();
    return {preset, start: r.start, end: r.end, label: 'This Week'};
  }
  if (preset === 'month') {
    const r = getMonthRange();
    return {preset, start: r.start, end: r.end, label: getMonthName(r.start)};
  }
  return {preset: 'today', start: today, end: today, label: 'Today'};
}

/* ═══════ Demo data (relative dates) ═══════ */
const initialProducts = [
  {
    id: 'p1',
    name: 'Premium Headphones',
    sku: 'AUD-1209',
    category: 'Electronics',
    quantity: 24,
    threshold: 8,
    sellingPrice: 900,
    costPrice: 520,
    purchasePrice: 520,
    weightedAverageCost: 520,
    purchaseBatches: [{quantity: 24, unitCost: 520, date: twoDaysAgo}],
    updatedAt: '2h ago',
  },
  {
    id: 'p2',
    name: 'Wireless POS Terminal',
    sku: 'POS-4430',
    category: 'Hardware',
    quantity: 6,
    threshold: 7,
    sellingPrice: 42000,
    costPrice: 31500,
    purchasePrice: 31500,
    weightedAverageCost: 31500,
    purchaseBatches: [{quantity: 6, unitCost: 31500, date: yesterday}],
    updatedAt: 'Today',
  },
  {
    id: 'p3',
    name: 'Thermal Receipt Roll',
    sku: 'SUP-0801',
    category: 'Supplies',
    quantity: 140,
    threshold: 40,
    sellingPrice: 650,
    costPrice: 420,
    purchasePrice: 420,
    weightedAverageCost: 420,
    purchaseBatches: [{quantity: 140, unitCost: 420, date: twoDaysAgo}],
    updatedAt: 'Yesterday',
  },
  {
    id: 'p4',
    name: 'Barcode Scanner',
    sku: 'HW-7812',
    category: 'Hardware',
    quantity: 12,
    threshold: 5,
    sellingPrice: 28500,
    costPrice: 22100,
    purchasePrice: 22100,
    weightedAverageCost: 22100,
    purchaseBatches: [{quantity: 12, unitCost: 22100, date: lastMonthDay3}],
    updatedAt: 'May 6',
  },
];

const initialSales = [
  {
    id: 's1',
    productId: 'p1',
    product: 'Premium Headphones',
    quantity: 6,
    total: 5400,
    paymentMethod: 'bank',
    date: today,
    time: '2 hours ago',
  },
  {
    id: 's2',
    productId: 'p3',
    product: 'Thermal Receipt Roll',
    quantity: 18,
    total: 11700,
    paymentMethod: 'cash',
    date: today,
    time: '10:18 AM',
  },
  {
    id: 's3',
    productId: 'p4',
    product: 'Barcode Scanner',
    quantity: 1,
    total: 28500,
    paymentMethod: 'cash',
    date: yesterday,
    time: 'Yesterday',
  },
  /* last-month entries for comparison */
  {
    id: 's4',
    productId: 'p1',
    product: 'Premium Headphones',
    quantity: 4,
    total: 3600,
    paymentMethod: 'cash',
    date: lastMonthDay1,
    time: 'Last month',
  },
  {
    id: 's5',
    productId: 'p3',
    product: 'Thermal Receipt Roll',
    quantity: 10,
    total: 6500,
    paymentMethod: 'bank',
    date: lastMonthDay2,
    time: 'Last month',
  },
  {
    id: 's6',
    productId: 'p2',
    product: 'Wireless POS Terminal',
    quantity: 1,
    total: 42000,
    paymentMethod: 'cash',
    date: lastMonthDay3,
    time: 'Last month',
  },
];

const initialServiceTypes = [
  {id: 'st1', name: 'POS Withdrawal'},
  {id: 'st2', name: 'Barbing'},
  {id: 'st3', name: 'Laundry'},
];

const initialServices = [
  {
    id: 'sv1',
    serviceType: 'POS Withdrawal',
    amount: 2600,
    paymentMethod: 'cash',
    date: today,
    time: '11:35 AM',
    notes: 'Customer cash-out fee',
  },
  {
    id: 'sv2',
    serviceType: 'Laundry',
    amount: 4200,
    paymentMethod: 'bank',
    date: today,
    time: '9:12 AM',
    notes: 'Express wash',
  },
  /* last-month entries */
  {
    id: 'sv3',
    serviceType: 'POS Withdrawal',
    amount: 1800,
    paymentMethod: 'cash',
    date: lastMonthDay1,
    time: 'Last month',
    notes: 'Cash-out',
  },
  {
    id: 'sv4',
    serviceType: 'Barbing',
    amount: 3500,
    paymentMethod: 'cash',
    date: lastMonthDay2,
    time: 'Last month',
    notes: 'Haircuts',
  },
];

const initialExpenses = [
  {
    id: 'e1',
    category: 'Transport',
    description: 'Delivery dispatch',
    amount: 4800,
    date: today,
  },
  {
    id: 'e2',
    category: 'Utilities',
    description: 'Shop power top-up',
    amount: 7200,
    date: yesterday,
  },
  {
    id: 'e3',
    category: 'Stock Purchase',
    description: 'Receipt roll restock',
    amount: 16800,
    date: twoDaysAgo,
  },
  /* last-month entries */
  {
    id: 'e4',
    category: 'Rent',
    description: 'Monthly shop rent',
    amount: 35000,
    date: lastMonthDay1,
  },
  {
    id: 'e5',
    category: 'Utilities',
    description: 'Power bill',
    amount: 8500,
    date: lastMonthDay2,
  },
];

const expenseCategories = [
  'Rent',
  'Utilities',
  'Transport',
  'Stock Purchase',
  'Marketing',
  'Miscellaneous',
];

const navItems = [
  {key: 'dashboard', label: 'Dashboard', shortcut: 'V', icon: BarChart3},
  {key: 'inventory', label: 'Inventory', shortcut: 'P', icon: Package},
  {key: 'sales', label: 'Sales', shortcut: 'C', icon: ShoppingCart},
  {key: 'expenses', label: 'Expenses', shortcut: 'C', icon: Receipt},
  {key: 'reports', label: 'Reports', shortcut: 'C', icon: TrendingUp},
  {key: 'sync', label: 'Settings', shortcut: 'C', icon: SettingsIcon},
];

function formatCurrency(amount, digits = 0) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(Number(amount || 0))
    .replace('NGN', NAIRA);
}

function formatPdfCurrency(amount, digits = 0) {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(amount || 0));
}

function formatLedgerDate(date, time) {
  const parsed = new Date(`${date}T00:00:00`);
  const dateLabel = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return time ? `${dateLabel} / ${time}` : dateLabel;
}

function getPurchaseBatches(product) {
  if (
    Array.isArray(product?.purchaseBatches) &&
    product.purchaseBatches.length > 0
  ) {
    return product.purchaseBatches
      .map(batch => ({
        quantity: Number(batch.quantity || 0),
        unitCost: Number(batch.unitCost || 0),
        date: batch.date || today,
      }))
      .filter(batch => batch.quantity > 0);
  }

  const quantity = Number(product?.quantity || 0);
  const unitCost = Number(
    product?.weightedAverageCost ??
      product?.purchasePrice ??
      product?.costPrice ??
      0,
  );

  return quantity > 0 && unitCost > 0
    ? [{quantity, unitCost, date: product?.updatedAt || today}]
    : [];
}

function calculateWac(product, purchaseQuantity, purchaseUnitCost) {
  const currentQuantity = Number(product?.quantity || 0);
  const currentCost = Number(
    product?.weightedAverageCost ??
      product?.purchasePrice ??
      product?.costPrice ??
      0,
  );
  const nextQuantity = Number(purchaseQuantity || 0);
  const nextCost = Number(purchaseUnitCost || 0);
  const totalQuantity = currentQuantity + nextQuantity;

  return totalQuantity > 0
    ? (currentQuantity * currentCost + nextQuantity * nextCost) / totalQuantity
    : 0;
}

function depleteBatchesFifo(product, quantityToSell) {
  let remainingToSell = Number(quantityToSell || 0);
  let cogs = 0;
  const remainingBatches = [];
  const fallbackCost = Number(
    product?.weightedAverageCost ??
      product?.purchasePrice ??
      product?.costPrice ??
      0,
  );

  getPurchaseBatches(product)
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))
    .forEach(batch => {
      if (remainingToSell <= 0) {
        remainingBatches.push(batch);
        return;
      }

      const consumedQuantity = Math.min(
        Number(batch.quantity || 0),
        remainingToSell,
      );
      cogs += consumedQuantity * Number(batch.unitCost || 0);
      remainingToSell -= consumedQuantity;

      const leftoverQuantity = Number(batch.quantity || 0) - consumedQuantity;
      if (leftoverQuantity > 0) {
        remainingBatches.push({...batch, quantity: leftoverQuantity});
      }
    });

  if (remainingToSell > 0) {
    cogs += remainingToSell * fallbackCost;
  }

  return {cogs, remainingBatches};
}

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

function TradeEaseApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [activeModal, setActiveModal] = useState('');
  const [products, setProducts] = useLocalStorageState('te_products', initialProducts);
  const [sales, setSales] = useLocalStorageState('te_sales', initialSales);
  const [services, setServices] = useLocalStorageState('te_services', initialServices);
  const [serviceTypes, setServiceTypes] = useLocalStorageState('te_serviceTypes', initialServiceTypes);
  const [expenses, setExpenses] = useLocalStorageState('te_expenses', initialExpenses);
  const [balanceDisplay, setBalanceDisplay] = useLocalStorageState('te_balanceDisplay', 'separate');
  const [expenseAllocation, setExpenseAllocation] = useLocalStorageState('te_expenseAllocation', 'combined');
  const [salesExpensePercent, setSalesExpensePercent] = useLocalStorageState('te_salesExpensePercent', 60);
  const [servicesExpensePercent, setServicesExpensePercent] = useLocalStorageState('te_servicesExpensePercent', 40);
  const [userName] = useState('testing18');
  const [business, setBusiness] = useLocalStorageState('te_business', {
    name: 'TradeEase Store',
    taxId: 'TIN-2480-TE',
    receiptPrefix: 'TE',
  });
  const [salesDateFilter, setSalesDateFilter] = useState(
    makeDateFilter('today'),
  );
  const [overviewDateFilter, setOverviewDateFilter] = useState(
    makeDateFilter('month'),
  );

  const navigate = screen => {
    if (screen === 'business-details') {
      setActiveModal('business-details');
      return;
    }

    const screenMap = {
      sell: 'sales',
      expense: 'expenses',
      stock: 'inventory',
      transactions: 'transactions',
    };
    setActiveScreen(screenMap[screen] || screen);
  };

  const saveBusiness = nextBusiness => {
    setBusiness(nextBusiness);
  };

  const appState = {
    products,
    sales,
    services,
    serviceTypes,
    expenses,
    setProducts,
    setSales,
    setServices,
    setServiceTypes,
    setExpenses,
    balanceDisplay,
    setBalanceDisplay,
    expenseAllocation,
    setExpenseAllocation,
    salesExpensePercent,
    setSalesExpensePercent,
    servicesExpensePercent,
    setServicesExpensePercent,
    userName,
    business,
    onSaveBusiness: saveBusiness,
    salesDateFilter,
    setSalesDateFilter,
    overviewDateFilter,
    setOverviewDateFilter,
    navigate,
    onLogout: () => {
      setIsAuthenticated(false);
      setActiveScreen('dashboard');
      setActiveModal('');
    },
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <main className="mobile-frame">
        {activeScreen === 'dashboard' && <Dashboard {...appState} />}
        {activeScreen === 'inventory' && <Inventory {...appState} />}
        {activeScreen === 'sales' && <Sales {...appState} />}
        {activeScreen === 'expenses' && <Expenses {...appState} />}
        {activeScreen === 'reports' && <Reports {...appState} />}
        {activeScreen === 'transactions' && (
          <TransactionHistory
            {...appState}
            onBack={() => setActiveScreen('reports')}
          />
        )}
        {activeScreen === 'sync' && <SettingsScreen {...appState} />}
      </main>

      <BottomNavigation
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
      />

      {activeModal === 'business-details' && (
        <BusinessDetailsSheet
          business={business}
          onClose={() => setActiveModal('')}
          onSave={saveBusiness}
        />
      )}
    </div>
  );
}

function BottomNavigation({activeScreen, onNavigate}) {
  const activeNavScreen =
    activeScreen === 'transactions' ? 'reports' : activeScreen;

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-panel">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeNavScreen === item.key;

          return (
            <button
              className={`nav-button ${active ? 'active' : ''}`}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button">
              <span className="nav-icon">
                <Icon size={20} strokeWidth={2.35} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ScreenHeader({eyebrow, title, action}) {
  return (
    <header className="screen-header">
      <div className="header-copy">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}

function Dashboard({
  products,
  sales,
  services,
  expenses,
  userName,
  navigate,
  overviewDateFilter,
  setOverviewDateFilter,
}) {
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [dayKey, setDayKey] = useState(getToday());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDayKey(getToday());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good Morning';
    }
    if (hour < 17) {
      return 'Good Afternoon';
    }
    return 'Good Evening';
  }, []);

  const stats = useMemo(() => {
    const mRange = overviewDateFilter;
    const lastM = getLastMonthRange();
    const todayKey = dayKey;
    const yesterdayKey = getYesterday();

    const heroSales = sales
      .filter(item => isInRange(item.date, mRange.start, mRange.end))
      .reduce((sum, item) => sum + item.total, 0);
    const heroServices = services
      .filter(item => isInRange(item.date, mRange.start, mRange.end))
      .reduce((sum, item) => sum + item.amount, 0);
    const heroRevenue = heroSales + heroServices;

    const heroExpenses = expenses
      .filter(item => isInRange(item.date, mRange.start, mRange.end))
      .reduce((sum, item) => sum + item.amount, 0);

    const dailySales = sales
      .filter(item => item.date === todayKey)
      .reduce((sum, item) => sum + item.total, 0);
    const dailyServices = services
      .filter(item => item.date === todayKey)
      .reduce((sum, item) => sum + item.amount, 0);
    const dailyExpenses = expenses
      .filter(item => item.date === todayKey)
      .reduce((sum, item) => sum + item.amount, 0);
    const dailyNetProfit = dailySales + dailyServices - dailyExpenses;

    const previousSales = sales
      .filter(item => item.date === yesterdayKey)
      .reduce((sum, item) => sum + item.total, 0);
    const previousServices = services
      .filter(item => item.date === yesterdayKey)
      .reduce((sum, item) => sum + item.amount, 0);
    const previousExpenses = expenses
      .filter(item => item.date === yesterdayKey)
      .reduce((sum, item) => sum + item.amount, 0);
    const previousNetProfit =
      previousSales + previousServices - previousExpenses;

    /* previous month for comparison */
    const prevSales = sales
      .filter(item => isInRange(item.date, lastM.start, lastM.end))
      .reduce((sum, item) => sum + item.total, 0);
    const prevServices = services
      .filter(item => isInRange(item.date, lastM.start, lastM.end))
      .reduce((sum, item) => sum + item.amount, 0);
    const prevRevenue = prevSales + prevServices;
    const prevExpenses = expenses
      .filter(item => isInRange(item.date, lastM.start, lastM.end))
      .reduce((sum, item) => sum + item.amount, 0);

    const heroNetProfit = heroRevenue - heroExpenses;
    const prevNetProfit = prevRevenue - prevExpenses;

    const lowStock = products.filter(
      item => item.quantity < item.threshold,
    ).length;
    const inventoryValue = products.reduce(
      (sum, item) =>
        sum +
        Number(
          item.weightedAverageCost ?? item.purchasePrice ?? item.costPrice ?? 0,
        ) *
          Number(item.quantity || 0),
      0,
    );

    return {
      dailySales,
      salesChange: calcChange(dailySales, previousSales),
      dailyServices,
      servicesChange: calcChange(dailyServices, previousServices),
      dailyExpenses,
      dailyNetProfit,
      netProfitChange: calcChange(dailyNetProfit, previousNetProfit),
      heroRevenue,
      heroNetProfit,
      inventoryValue,
      lowStock,
      balanceChange: calcChange(heroNetProfit, prevNetProfit),
      revenueChange: calcChange(heroRevenue, prevRevenue),
      expenseChange: calcChange(dailyExpenses, previousExpenses),
    };
  }, [dayKey, expenses, overviewDateFilter, products, sales, services]);

  return (
    <section className="screen animate-in">
      <ScreenHeader
        eyebrow={`${greeting}, ${userName}`}
        title="Dashboard"
        action={
          <div className="header-actions">
            <button
              className="avatar"
              type="button"
              aria-label="Open business details"
              onClick={() => navigate('business-details')}>
              <Building2 size={21} strokeWidth={2.4} />
              <span />
            </button>
          </div>
        }
      />

      <section className="balance-card">
        <CardDatePill
          label={getFilterLabel(overviewDateFilter)}
          onClick={() => setDateSheetOpen(true)}
        />
        <div className="balance-orb orb-one" />
        <div className="balance-orb orb-two" />
        <div className="balance-content">
          <div className="eyebrow-row">
            <Sparkles size={16} />
            <span>Total Balance</span>
          </div>
          <strong>{formatCurrency(stats.heroNetProfit)}</strong>
          <p>Revenue minus expenses — {getFilterLabel(overviewDateFilter)}</p>
          <ComparisonPill
            change={stats.balanceChange}
            label="vs last month"
            glass
          />
        </div>
      </section>

      <div className="quick-actions">
        <QuickAction
          label="Sell"
          icon={ShoppingCart}
          onClick={() => navigate('sales')}
        />
        <QuickAction
          label="Expense"
          icon={Receipt}
          tone="warning"
          onClick={() => navigate('expenses')}
        />
        <QuickAction
          label="Stock"
          icon={Package}
          tone="blue"
          onClick={() => navigate('inventory')}
        />
      </div>

      <div className="stats-grid daily-stats-grid">
        <Metric
          label="Sales"
          value={formatCurrency(stats.dailySales)}
          icon={ArrowUpRight}
          tone="success"
          change={stats.salesChange}
          glass
        />
        <Metric
          label="Services"
          value={formatCurrency(stats.dailyServices)}
          icon={Activity}
          tone="default"
          change={stats.servicesChange}
          glass
        />
        <Metric
          label="Expenses"
          value={formatCurrency(stats.dailyExpenses)}
          icon={TrendingDown}
          tone="danger"
          change={stats.expenseChange}
          glass
        />
        <Metric
          label="Net Profit"
          value={formatCurrency(stats.dailyNetProfit)}
          icon={Sparkles}
          tone={stats.dailyNetProfit >= 0 ? 'success' : 'danger'}
          change={stats.netProfitChange}
          glass
        />
      </div>

      <div className="stats-grid secondary-stats-grid">
        <Metric
          label="Inventory Value"
          value={formatCurrency(stats.inventoryValue)}
          icon={Package}
          tone="blue"
        />
      </div>

      <button
        className="low-stock-card"
        type="button"
        onClick={() => navigate('inventory')}>
        <span className="soft-icon warning">
          <AlertTriangle size={22} />
        </span>
        <span className="low-stock-copy">
          <strong>Low Stock Items</strong>
          <small>Products running low</small>
        </span>
        <b>{stats.lowStock}</b>
      </button>

      <SectionTitle
        title="Recent Activity"
        action="View All"
        onAction={() => navigate('reports')}
      />
      <div className="activity-list">
        {[
          ...sales.map(item => ({...item, type: 'sale'})),
          ...services.map(item => ({...item, type: 'service'})),
          ...expenses.map(item => ({...item, type: 'expense'})),
        ]
          .filter(item =>
            isInRange(
              item.date,
              overviewDateFilter.start,
              overviewDateFilter.end,
            ),
          )
          .sort((a, b) => {
            const idA = Number(String(a.id).replace(/\D/g, ''));
            const idB = Number(String(b.id).replace(/\D/g, ''));
            return idB - idA;
          })
          .slice(0, 5)
          .map(item => (
            <Transaction
              key={item.id}
              icon={
                item.type === 'sale'
                  ? ShoppingCart
                  : item.type === 'service'
                  ? Activity
                  : Receipt
              }
              title={
                item.type === 'sale'
                  ? item.product
                  : item.type === 'service'
                  ? item.serviceType
                  : item.category
              }
              meta={
                item.type === 'sale'
                  ? `Qty ${item.quantity} / ${item.time}`
                  : item.type === 'service'
                  ? `Service / ${item.time}`
                  : `Expense / ${item.time || item.date}`
              }
              amount={`${item.type === 'expense' ? '-' : '+'}${formatCurrency(
                item.type === 'sale' ? item.total : item.amount,
              )}`}
              tone={item.type === 'expense' ? 'danger' : 'success'}
            />
          ))}
      </div>

      {dateSheetOpen && (
        <DateFilterSheet
          current={overviewDateFilter}
          onChange={filter => {
            setOverviewDateFilter(filter);
            setDateSheetOpen(false);
          }}
          onClose={() => setDateSheetOpen(false)}
        />
      )}
    </section>
  );
}

function QuickAction({label, icon: Icon, tone = 'primary', onClick}) {
  return (
    <button className="quick-card" onClick={onClick} type="button">
      <span className={`quick-icon ${tone}`}>
        <Icon size={21} />
      </span>
      <span className="quick-label">
        <strong>{label}</strong>
      </span>
    </button>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = 'default',
  change,
  glass = false,
}) {
  return (
    <article className="metric-card">
      <div className="metric-head">
        <span>{label}</span>
        <Icon className={`metric-icon ${tone}`} size={17} />
      </div>
      <strong className={tone}>{value}</strong>
      {change && (
        <ComparisonPill change={change} label="vs prev" compact glass={glass} />
      )}
    </article>
  );
}

function CardDatePill({label, onClick}) {
  return (
    <button className="card-date-pill" type="button" onClick={onClick}>
      {label}
      <ChevronDown size={12} />
    </button>
  );
}

function ComparisonPill({
  change,
  label = 'vs last month',
  glass = false,
  compact = false,
}) {
  if (!change || change.direction === 'flat') {
    return null;
  }
  const isUp = change.direction === 'up';
  const Icon = isUp ? TrendingUp : TrendingDown;
  const cls = `comparison-pill ${isUp ? 'up' : 'down'} ${
    glass ? 'glass' : ''
  } ${compact ? 'compact' : ''}`;

  return (
    <span className={cls}>
      <Icon size={compact ? 12 : 14} />
      {isUp ? '+' : '-'}
      {change.percent}% {label}
    </span>
  );
}

function DateFilterSheet({current, onChange, onClose}) {
  const [customStart, setCustomStart] = useState(current.start);
  const [customEnd, setCustomEnd] = useState(current.end);

  const presets = [
    {key: 'today', label: 'Today'},
    {key: 'week', label: 'This Week'},
    {key: 'month', label: 'This Month'},
  ];

  return (
    <Sheet
      title="Select Date Range"
      onClose={onClose}
      className="settings-sheet locked-sheet">
      <div className="date-presets">
        {presets.map(p => (
          <button
            className={`date-preset-btn ${
              current.preset === p.key ? 'active' : ''
            }`}
            key={p.key}
            type="button"
            onClick={() => onChange(makeDateFilter(p.key))}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="custom-range">
        <strong>Custom Range</strong>
        <div className="custom-range-inputs">
          <label>
            <small>From</small>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
          </label>
          <label>
            <small>To</small>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </label>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() =>
            onChange({
              preset: 'custom',
              start: customStart,
              end: customEnd,
              label: `${customStart.slice(5)} – ${customEnd.slice(5)}`,
            })
          }>
          Apply Range
        </button>
      </div>
    </Sheet>
  );
}

function Inventory({products, setProducts, sales, expenses, setExpenses}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockForm, setRestockForm] = useState({
    quantity: '',
    unitCost: '',
    date: today,
  });
  const [toast, setToast] = useState('');

  const counts = useMemo(() => {
    const low = products.filter(item => item.quantity < item.threshold).length;
    return {all: products.length, low, ok: products.length - low};
  }, [products]);

  const inventoryValue = products.reduce(
    (sum, item) =>
      sum +
      Number(
        item.weightedAverageCost ?? item.purchasePrice ?? item.costPrice ?? 0,
      ) *
        Number(item.quantity || 0),
    0,
  );

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter(product => {
      const low = product.quantity < product.threshold;
      const matchesFilter = filter === 'all' || (filter === 'low' ? low : !low);
      const matchesSearch =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized) ||
        product.category.toLowerCase().includes(normalized);

      return matchesFilter && matchesSearch;
    });
  }, [filter, products, query]);

  const selectedProduct = products.find(
    product => product.id === selectedProductId,
  );
  const selectedProductSales = selectedProduct
    ? [
        ...sales
          .filter(item => item.productId === selectedProduct.id)
          .map(item => ({...item, type: 'sale'})),
        ...expenses
          .filter(
            item =>
              item.productId === selectedProduct.id ||
              (item.category === 'Stock Purchase' &&
                item.description.includes(`Restock: ${selectedProduct.name}`)),
          )
          .map(item => ({
            ...item,
            type: 'expense',
            quantity:
              item.quantity ||
              (item.description.match(/\((\d+)\sunits\)/)
                ? Number(item.description.match(/\((\d+)\sunits\)/)[1])
                : 0),
          })),
      ].sort((a, b) => {
        const idA = Number(String(a.id).replace(/\D/g, ''));
        const idB = Number(String(b.id).replace(/\D/g, ''));
        return idB - idA;
      })
    : [];

  const resetRestockState = () => {
    setIsRestockOpen(false);
    setRestockForm({
      quantity: '',
      unitCost: '',
      date: today,
    });
  };

  const closeProductDetail = () => {
    setSelectedProductId('');
    setIsEditingProduct(false);
    resetRestockState();
  };

  const openRestock = () => {
    if (!selectedProduct) {
      return;
    }

    setIsEditingProduct(false);
    setRestockForm({
      quantity: '',
      unitCost: String(
        selectedProduct.purchasePrice ??
          selectedProduct.weightedAverageCost ??
          selectedProduct.costPrice ??
          '',
      ),
      date: today,
    });
    setIsRestockOpen(true);
  };

  const addProduct = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextProduct = {
      id: `p${Date.now()}`,
      name: data.get('name') || 'New Product',
      sku: data.get('sku') || `SKU-${Date.now().toString().slice(-4)}`,
      category: data.get('category') || 'General',
      quantity: Number(data.get('quantity') || 0),
      threshold: Number(data.get('threshold') || 5),
      sellingPrice: Number(data.get('sellingPrice') || 0),
      costPrice: Number(data.get('costPrice') || 0),
      purchasePrice: Number(data.get('costPrice') || 0),
      weightedAverageCost: Number(data.get('costPrice') || 0),
      purchaseBatches:
        Number(data.get('quantity') || 0) > 0 &&
        Number(data.get('costPrice') || 0) > 0
          ? [
              {
                quantity: Number(data.get('quantity') || 0),
                unitCost: Number(data.get('costPrice') || 0),
                date: today,
              },
            ]
          : [],
      updatedAt: getCurrentTime(),
    };

    setProducts(current => [nextProduct, ...current]);
    setModalOpen(false);
  };

  const updateProduct = event => {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }

    const data = new FormData(event.currentTarget);
    setProducts(current =>
      current.map(product =>
        product.id === selectedProduct.id
          ? {
              ...product,
              name: data.get('name') || product.name,
              sku: data.get('sku') || product.sku,
              category: data.get('category') || product.category,
              quantity: Number(data.get('quantity') || product.quantity),
              threshold: Number(data.get('threshold') || product.threshold),
              sellingPrice: Number(
                data.get('sellingPrice') || product.sellingPrice,
              ),
              costPrice: Number(data.get('costPrice') || product.costPrice),
              purchasePrice: Number(
                data.get('costPrice') ||
                  product.purchasePrice ||
                  product.costPrice,
              ),
              weightedAverageCost: Number(
                data.get('costPrice') ||
                  product.weightedAverageCost ||
                  product.purchasePrice ||
                  product.costPrice,
              ),
              purchaseBatches:
                Number(data.get('quantity') || product.quantity) > 0
                  ? [
                      {
                        quantity: Number(
                          data.get('quantity') || product.quantity,
                        ),
                        unitCost: Number(
                          data.get('costPrice') ||
                            product.weightedAverageCost ||
                            product.purchasePrice ||
                            product.costPrice,
                        ),
                        date: today,
                      },
                    ]
                  : [],
              updatedAt: getCurrentTime(),
            }
          : product,
      ),
    );
    setIsEditingProduct(false);
  };

  const saveRestock = event => {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const quantity = Number(restockForm.quantity || 0);
    const unitCost = Number(restockForm.unitCost || 0);

    if (quantity <= 0 || unitCost <= 0 || !restockForm.date) {
      return;
    }

    const totalAmount = quantity * unitCost;
    const weightedAverageCost = calculateWac(
      selectedProduct,
      quantity,
      unitCost,
    );
    const purchaseBatches = [
      ...getPurchaseBatches(selectedProduct),
      {quantity, unitCost, date: restockForm.date},
    ].sort((left, right) =>
      String(left.date).localeCompare(String(right.date)),
    );

    setProducts(current =>
      current.map(product =>
        product.id === selectedProduct.id
          ? {
              ...product,
              quantity: Number(product.quantity || 0) + quantity,
              costPrice: unitCost,
              purchasePrice: unitCost,
              weightedAverageCost,
              purchaseBatches,
              updatedAt: getCurrentTime(),
            }
          : product,
      ),
    );
    setExpenses(current => [
      {
        id: `e${Date.now()}`,
        productId: selectedProduct.id,
        quantity,
        category: 'Stock Purchase',
        description: `Restock: ${selectedProduct.name} (${quantity} units)`,
        amount: totalAmount,
        date: restockForm.date,
        time: getCurrentTime(),
      },
      ...current,
    ]);
    setToast(`Inventory Updated +${quantity}`);
    resetRestockState();
    window.setTimeout(() => setToast(''), 1800);
  };

  return (
    <section className="screen animate-in">
      <ScreenHeader
        eyebrow="Inventory"
        title="Stock"
        action={
          <button
            aria-label="Add product"
            className="header-add-button"
            type="button"
            onClick={() => setModalOpen(true)}>
            <Plus size={23} strokeWidth={2.4} />
          </button>
        }
      />

      <div className="inventory-summary">
        <SummaryTile label="Items" value={counts.all} />
        <SummaryTile label="Low Stock" value={counts.low} tone="warning" />
        <SummaryTile
          label="Stock Value"
          value={formatCurrency(inventoryValue)}
          wide
        />
      </div>

      <label className="search-field">
        <Search size={19} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search products, SKU, category"
        />
      </label>

      <div className="segmented-control">
        {[
          ['all', 'All', counts.all],
          ['low', 'Low', counts.low],
          ['ok', 'OK', counts.ok],
        ].map(([key, label, count]) => (
          <button
            className={filter === key ? 'active' : ''}
            key={key}
            onClick={() => setFilter(key)}
            type="button">
            {label} <span>{count}</span>
          </button>
        ))}
      </div>

      <div className="product-list">
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onOpen={() => {
              resetRestockState();
              setSelectedProductId(product.id);
              setIsEditingProduct(false);
            }}
          />
        ))}
      </div>

      {modalOpen && (
        <Sheet
          title="Add Product"
          onClose={() => setModalOpen(false)}
          className="add-product-sheet locked-sheet">
          <form className="sheet-form" onSubmit={addProduct}>
            <input name="name" placeholder="Product name" required />
            <input name="sku" placeholder="SKU" />
            <input name="category" placeholder="Category" />
            <div className="form-row">
              <input
                name="costPrice"
                inputMode="decimal"
                placeholder="Cost price"
              />
              <input
                name="sellingPrice"
                inputMode="decimal"
                placeholder="Selling price"
              />
            </div>
            <div className="form-row">
              <input
                name="quantity"
                inputMode="numeric"
                placeholder="Quantity"
              />
              <input
                name="threshold"
                inputMode="numeric"
                placeholder="Low stock at"
              />
            </div>
            <button className="primary-button" type="submit">
              Save Product
            </button>
          </form>
        </Sheet>
      )}

      {selectedProduct && !isRestockOpen && (
        <Sheet
          title={selectedProduct.name}
          onClose={closeProductDetail}
          className={`product-detail-sheet ${
            isEditingProduct ? 'locked-sheet' : ''
          }`}>
          <ProductDetail
            product={selectedProduct}
            transactions={selectedProductSales}
            isEditing={isEditingProduct}
            onEdit={() => setIsEditingProduct(true)}
            onCancelEdit={() => setIsEditingProduct(false)}
            onSave={updateProduct}
            onRestock={openRestock}
          />
        </Sheet>
      )}

      {isRestockOpen && selectedProduct && (
        <Sheet
          title="Purchase/Restock"
          onClose={resetRestockState}
          className="purchase-restock-sheet"
          layer="raised">
          <form className="sheet-form restock-form" onSubmit={saveRestock}>
            <div className="selected-product restock-product">
              <strong>{selectedProduct.name}</strong>
              <span>
                Current stock {selectedProduct.quantity} / Last cost{' '}
                {formatCurrency(
                  selectedProduct.purchasePrice ??
                    selectedProduct.weightedAverageCost ??
                    selectedProduct.costPrice,
                )}
              </span>
            </div>
            <div className="form-row">
              <input
                inputMode="numeric"
                min="1"
                onChange={event =>
                  setRestockForm(current => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                placeholder="Quantity"
                required
                type="number"
                value={restockForm.quantity}
              />
              <input
                inputMode="decimal"
                min="0"
                onChange={event =>
                  setRestockForm(current => ({
                    ...current,
                    unitCost: event.target.value,
                  }))
                }
                placeholder="Unit Cost"
                required
                type="number"
                value={restockForm.unitCost}
              />
            </div>
            <div className="restock-total">
              <span>Total Amount</span>
              <strong>
                {formatCurrency(
                  Number(restockForm.quantity || 0) *
                    Number(restockForm.unitCost || 0),
                )}
              </strong>
            </div>
            <div className="date-control">
              <button
                type="button"
                onClick={() =>
                  setRestockForm(current => ({...current, date: yesterday}))
                }
                aria-label="Previous day">
                <ChevronLeft size={18} />
              </button>
              <input
                max={today}
                onChange={event =>
                  setRestockForm(current => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                type="date"
                value={restockForm.date}
              />
              <button
                type="button"
                onClick={() =>
                  setRestockForm(current => ({...current, date: today}))
                }>
                Today
              </button>
            </div>
            <button className="primary-button" type="submit">
              Save Restock
            </button>
          </form>
        </Sheet>
      )}

      {toast && <div className="success-toast">{toast}</div>}
    </section>
  );
}

function SummaryTile({label, value, tone = 'default', wide = false}) {
  return (
    <article className={`summary-tile ${tone} ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ProductCard({product, onOpen}) {
  const low = product.quantity < product.threshold;
  const progress = Math.min(
    100,
    Math.round((product.quantity / Math.max(product.threshold * 3, 1)) * 100),
  );
  const margin =
    product.sellingPrice -
    (product.weightedAverageCost ??
      product.purchasePrice ??
      product.costPrice ??
      0);

  return (
    <article
      className={`product-card ${low ? 'low' : ''}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}>
      <div className="product-top">
        <span className={`soft-icon ${low ? 'danger' : 'primary'}`}>
          <Package size={21} />
        </span>
        <div className="product-main">
          <div className="product-title-row">
            <h3>{product.name}</h3>
            {low && <span className="low-badge">LOW</span>}
          </div>
          <p>
            {product.sku} / {product.category}
          </p>
        </div>
        <ChevronRight size={18} className="muted-icon" />
      </div>

      <div className="stock-meter">
        <div>
          <span>Qty {product.quantity}</span>
          <span>Min {product.threshold}</span>
        </div>
        <div className="meter-track">
          <span style={{width: `${progress}%`}} />
        </div>
      </div>

      <div className="product-bottom">
        <div>
          <span>Selling Price</span>
          <strong>{formatCurrency(product.sellingPrice)}</strong>
        </div>
        <div>
          <span>Margin</span>
          <strong className={margin >= 0 ? 'success' : 'danger'}>
            {formatCurrency(margin)}
          </strong>
        </div>
        <small>{product.updatedAt}</small>
      </div>
    </article>
  );
}

function ProductDetail({
  product,
  transactions,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onRestock,
}) {
  const purchasePrice =
    product.weightedAverageCost ??
    product.purchasePrice ??
    product.costPrice ??
    0;
  const margin = product.sellingPrice - purchasePrice;
  const soldUnits = transactions.reduce(
    (sum, item) => (item.type === 'sale' ? sum + item.quantity : sum),
    0,
  );
  const revenue = transactions.reduce(
    (sum, item) => (item.type === 'sale' ? sum + item.total : sum),
    0,
  );

  return (
    <div className="product-detail">
      {!isEditing && (
        <>
          <div className="detail-hero">
            <span
              className={`soft-icon ${
                product.quantity < product.threshold ? 'danger' : 'primary'
              }`}>
              <Package size={22} />
            </span>
            <div>
              <h3>{product.name}</h3>
              <p>
                {product.sku} / {product.category}
              </p>
            </div>
          </div>

          <div className="detail-stats">
            <SummaryTile label="Quantity" value={product.quantity} />
            <SummaryTile label="Sold Units" value={soldUnits} />
            <SummaryTile label="Revenue" value={formatCurrency(revenue)} wide />
          </div>
        </>
      )}

      {isEditing ? (
        <form className="sheet-form" onSubmit={onSave}>
          <input
            name="name"
            defaultValue={product.name}
            placeholder="Product name"
            required
          />
          <input name="sku" defaultValue={product.sku} placeholder="SKU" />
          <input
            name="category"
            defaultValue={product.category}
            placeholder="Category"
          />
          <div className="form-row">
            <input
              name="costPrice"
              defaultValue={purchasePrice}
              inputMode="decimal"
              placeholder="Purchase price"
            />
            <input
              name="sellingPrice"
              defaultValue={product.sellingPrice}
              inputMode="decimal"
              placeholder="Selling price"
            />
          </div>
          <div className="form-row">
            <input
              name="quantity"
              defaultValue={product.quantity}
              inputMode="numeric"
              placeholder="Quantity"
            />
            <input
              name="threshold"
              defaultValue={product.threshold}
              inputMode="numeric"
              placeholder="Low stock at"
            />
          </div>
          <div className="detail-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onCancelEdit}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="detail-price-grid">
            <div>
              <span>Selling Price</span>
              <strong>{formatCurrency(product.sellingPrice)}</strong>
            </div>
            <div>
              <span>Weighted Avg Cost</span>
              <strong>{formatCurrency(purchasePrice)}</strong>
            </div>
            <div>
              <span>Margin</span>
              <strong className={margin >= 0 ? 'success' : 'danger'}>
                {formatCurrency(margin)}
              </strong>
            </div>
          </div>

          <div className="detail-actions">
            <button
              className="primary-button restock-cta"
              type="button"
              onClick={onRestock}>
              <PackagePlus size={19} />
              Purchase/Restock
            </button>
            <button className="secondary-button" type="button" onClick={onEdit}>
              Edit Product
            </button>
          </div>

          <div className="detail-section-title">
            <h3>Product Transactions</h3>
            <span>{transactions.length}</span>
          </div>
          <div className="detail-transactions">
            {transactions.length > 0 ? (
              transactions.map(item => (
                <Transaction
                  key={item.id}
                  icon={item.type === 'expense' ? PackagePlus : ShoppingCart}
                  title={item.type === 'expense' ? 'Restock' : item.product}
                  meta={`Qty ${item.quantity} / ${item.time || item.date}`}
                  amount={
                    item.type === 'expense'
                      ? `-${formatCurrency(item.amount)}`
                      : `+${formatCurrency(item.total)}`
                  }
                  tone={item.type === 'expense' ? 'danger' : 'success'}
                />
              ))
            ) : (
              <p className="empty-copy">
                No transactions recorded for this product yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Sales({
  products,
  setProducts,
  sales,
  setSales,
  services,
  setServices,
  serviceTypes,
  balanceDisplay,
  salesDateFilter,
  setSalesDateFilter,
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [saleStep, setSaleStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedId, setSelectedId] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [serviceAmount, setServiceAmount] = useState('');
  const [servicePaymentMethod, setServicePaymentMethod] = useState('cash');
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes[0]?.id || '');
  const [serviceNotes, setServiceNotes] = useState('');
  const [activeForm, setActiveForm] = useState('');
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const [balanceView, setBalanceView] = useState(
    balanceDisplay === 'combined'
      ? 'both'
      : balanceDisplay === 'services_only'
      ? 'services'
      : 'sales',
  );
  const [transactionView, setTransactionView] = useState('both');

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [products]);

  const salesCounts = useMemo(() => {
    const counts = {};
    sales.forEach(s => {
      if (s.productId) {
        counts[s.productId] = (counts[s.productId] || 0) + 1;
      }
    });
    return counts;
  }, [sales]);

  const selectedProduct = products.find(item => item.id === selectedId);
  const selectedServiceType = serviceTypes.find(
    item => item.id === serviceTypeId,
  );

  const filteredProducts = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let result = products;
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }
    
    if (q) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    } else {
      result = [...result].sort((a, b) => {
        const countA = salesCounts[a.id] || 0;
        const countB = salesCounts[b.id] || 0;
        return countB - countA;
      });
      if (selectedCategory === 'All') {
        result = result.slice(0, 4);
      }
    }
    return result;
  }, [debouncedQuery, products, selectedCategory, salesCounts]);
  const currentPrice = manualPrice === '' ? 0 : Number(manualPrice);
  const total = Number(quantity || 0) * currentPrice;
  const wac = selectedProduct 
    ? (selectedProduct.weightedAverageCost ?? selectedProduct.purchasePrice ?? selectedProduct.costPrice ?? 0)
    : 0;
  const isSellingAtLoss = currentPrice > 0 && currentPrice < wac;

  const f = salesDateFilter;
  const filteredSales = sales.filter(item =>
    isInRange(item.date, f.start, f.end),
  );
  const filteredServices = services.filter(item =>
    isInRange(item.date, f.start, f.end),
  );

  /* previous day for comparison */
  const prevDay = toISO(
    new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1),
  );
  const prevSalesTotal = sales
    .filter(item => item.date === prevDay)
    .reduce((sum, item) => sum + item.total, 0);
  const prevServicesTotal = services
    .filter(item => item.date === prevDay)
    .reduce((sum, item) => sum + item.amount, 0);
  const prevTotal = prevSalesTotal + prevServicesTotal;

  const balance = useMemo(
    () => ({
      salesCash: filteredSales
        .filter(item => (item.paymentMethod || 'cash') === 'cash')
        .reduce((sum, item) => sum + item.total, 0),
      salesBank: filteredSales
        .filter(item => item.paymentMethod === 'bank')
        .reduce((sum, item) => sum + item.total, 0),
      servicesCash: filteredServices
        .filter(item => (item.paymentMethod || 'cash') === 'cash')
        .reduce((sum, item) => sum + item.amount, 0),
      servicesBank: filteredServices
        .filter(item => item.paymentMethod === 'bank')
        .reduce((sum, item) => sum + item.amount, 0),
    }),
    [filteredSales, filteredServices],
  );

  const totalBalance =
    balance.salesCash +
    balance.salesBank +
    balance.servicesCash +
    balance.servicesBank;
  const salesChange = calcChange(totalBalance, prevTotal);

  const balanceRows =
    balanceView === 'sales'
      ? [
          ['Sales Cash', balance.salesCash],
          ['Sales Bank', balance.salesBank],
        ]
      : balanceView === 'services'
      ? [
          ['Services Cash', balance.servicesCash],
          ['Services Bank', balance.servicesBank],
        ]
      : [
          ['Total Cash', balance.salesCash + balance.servicesCash],
          ['Total Bank', balance.salesBank + balance.servicesBank],
        ];
  const transactions = [
    ...filteredSales.map(item => ({...item, type: 'sale'})),
    ...filteredServices.map(item => ({...item, type: 'service'})),
  ]
    .filter(item => {
      if (transactionView === 'sales') {
        return item.type === 'sale';
      }
      if (transactionView === 'services') {
        return item.type === 'service';
      }
      return true;
    })
    .sort((a, b) => {
      const idA = Number(String(a.id).replace(/\D/g, ''));
      const idB = Number(String(b.id).replace(/\D/g, ''));
      return idB - idA;
    });

  const recordSale = () => {
    if (
      !selectedProduct ||
      quantity < 1 ||
      quantity > selectedProduct.quantity
    ) {
      return;
    }

    const fifoResult = depleteBatchesFifo(selectedProduct, quantity);

    setSales(current => [
      {
        id: `s${Date.now()}`,
        productId: selectedProduct.id,
        product: selectedProduct.name,
        quantity,
        price: currentPrice,
        total,
        cogs: fifoResult.cogs,
        paymentMethod,
        date: today,
        time: getCurrentTime(),
      },
      ...current,
    ]);
    setProducts(current =>
      current.map(item =>
        item.id === selectedProduct.id
          ? {
              ...item,
              quantity: item.quantity - quantity,
              purchaseBatches: fifoResult.remainingBatches,
              updatedAt: getCurrentTime(),
            }
          : item,
      ),
    );
    setQuantity(1);
    setPaymentMethod('cash');
    setQuery('');
    setDebouncedQuery('');
    setSaleStep(1);
    setSelectedCategory('All');
    setSelectedId('');
    setManualPrice('');
    setActiveForm('');
  };

  const closeSaleForm = () => {
    setActiveForm('');
    setQuery('');
    setDebouncedQuery('');
    setSaleStep(1);
    setSelectedCategory('All');
    setSelectedId('');
    setManualPrice('');
    setQuantity(1);
  };

  const recordService = event => {
    event.preventDefault();
    const amount = Number(serviceAmount || 0);

    if (!selectedServiceType || amount <= 0) {
      return;
    }

    setServices(current => [
      {
        id: `sv${Date.now()}`,
        serviceType: selectedServiceType.name,
        amount,
        paymentMethod: servicePaymentMethod,
        date: today,
        time: getCurrentTime(),
        notes: serviceNotes,
      },
      ...current,
    ]);
    setServiceAmount('');
    setServicePaymentMethod('cash');
    setServiceNotes('');
    setActiveForm('');
  };

  const balanceLabel =
    f.preset === 'today'
      ? 'Today\u0027s Balance'
      : f.preset === 'week'
      ? 'This Week\u0027s Balance'
      : f.preset === 'month'
      ? `Balance for ${getMonthName(f.start)}`
      : `Balance (${f.start.slice(5)} – ${f.end.slice(5)})`;

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Sales" title="Sales and Services" />

      <article className="sales-balance-card">
        <CardDatePill
          label={getFilterLabel(salesDateFilter)}
          onClick={() => setDateSheetOpen(true)}
        />
        <div className="sales-balance-head">
          <div>
            <span>{balanceLabel}</span>
            <strong>{formatCurrency(totalBalance)}</strong>
            <ComparisonPill change={salesChange} label="vs yesterday" glass />
          </div>
        </div>
        <div className="mini-tabs">
          {[
            ['sales', 'Sales'],
            ['services', 'Services'],
            ['both', 'Both'],
          ].map(([key, label]) => (
            <button
              className={balanceView === key ? 'active' : ''}
              key={key}
              onClick={() => setBalanceView(key)}
              type="button">
              {label}
            </button>
          ))}
        </div>
        <div className="balance-row-grid">
          {balanceRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{formatCurrency(value)}</strong>
            </div>
          ))}
        </div>
      </article>

      <div className="sales-action-row">
        <button
          className="sale-action sale"
          type="button"
          onClick={() => setActiveForm('sale')}>
          Sale
        </button>
        <button
          className="sale-action service"
          type="button"
          onClick={() => setActiveForm('service')}>
          Service
        </button>
      </div>

      {activeForm === 'sale' && (
        <Sheet
          title={saleStep === 1 ? 'Record Product Sale' : 'Configure Sale'}
          onClose={closeSaleForm}
          className="sales-sheet">
          <article className="form-card sale-card step-container">
            {saleStep === 1 ? (
              <>
                <label className="field-label">Product</label>
                <label className="search-field compact-search">
                  <Search size={18} />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search and select product"
                    autoFocus
                  />
                </label>

                <div className="category-chip-row">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}>
                      {cat}
                    </button>
                  ))}
                </div>

                {!debouncedQuery && selectedCategory === 'All' && filteredProducts.length > 0 && (
                   <p className="frequently-sold-label">FREQUENTLY SOLD</p>
                )}

                <div className="product-options compact-list">
                  {filteredProducts.map(product => {
                    const isOnlyMatch = filteredProducts.length === 1 && debouncedQuery.trim().length > 0;
                    const isActive = selectedId === product.id || isOnlyMatch;
                    return (
                      <button
                        className={isActive ? 'active' : ''}
                        key={product.id}
                        onClick={() => {
                          setSelectedId(product.id);
                          setManualPrice(String(product.sellingPrice || 0));
                          setSaleStep(2);
                        }}
                        type="button">
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            Qty {product.quantity} / {formatCurrency(product.sellingPrice)}
                          </small>
                        </span>
                        {isActive && <CheckCircle2 size={18} />}
                      </button>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                     <p className="empty-copy">No matching products found.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="step-header">
                  <button type="button" onClick={() => setSaleStep(1)} className="back-btn">
                    <ArrowLeft size={20} />
                  </button>
                  <strong>{selectedProduct?.name}</strong>
                </div>

                {selectedProduct && (
                  <div className={`selected-product compact-selected ${manualPrice !== '' && Number(manualPrice) !== selectedProduct.sellingPrice ? 'price-modified' : ''}`}>
                    <strong>{selectedProduct.name}</strong>
                    <span>
                      Available {selectedProduct.quantity} / Standard {formatCurrency(selectedProduct.sellingPrice)}
                    </span>
                  </div>
                )}

                <div className="manual-price-container">
                  <label className="field-label">Unit Price (₦)</label>
                  <div className={`price-input-wrapper ${manualPrice !== '' && Number(manualPrice) !== selectedProduct?.sellingPrice ? 'modified' : ''}`}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="Enter price"
                    />
                    {manualPrice !== '' && selectedProduct && Number(manualPrice) !== selectedProduct.sellingPrice && (
                      <button
                        type="button"
                        className="reset-price-btn"
                        onClick={() => setManualPrice(String(selectedProduct.sellingPrice))}
                        title="Reset to standard price"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>
                  {isSellingAtLoss && (
                    <p className="margin-warning">
                      <AlertTriangle size={14} /> Selling below cost ({formatCurrency(wac)})
                    </p>
                  )}
                </div>

                <div className="quantity-stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}>
                    <Minus size={18} />
                  </button>
                  <input
                    value={quantity}
                    inputMode="numeric"
                    onChange={event =>
                      setQuantity(Math.max(1, Number(event.target.value || 1)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(value => value + 1)}>
                    <Plus size={18} />
                  </button>
                </div>

                <div className="mini-tabs">
                  {[
                    ['cash', 'Cash'],
                    ['bank', 'Bank Transfer'],
                  ].map(([key, label]) => (
                    <button
                      className={paymentMethod === key ? 'active' : ''}
                      key={key}
                      onClick={() => setPaymentMethod(key)}
                      type="button">
                      {label}
                    </button>
                  ))}
                </div>

                {selectedProduct && quantity > selectedProduct.quantity && (
                  <p className="warning-text">
                    Only {selectedProduct.quantity} item(s) available.
                  </p>
                )}

                <div className="total-box">
                  <span>Calculated Total</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>

                <div className="sale-actions-bottom">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!selectedProduct || quantity < 1 || quantity > selectedProduct.quantity}
                    onClick={recordSale}>
                    Confirm Sale
                  </button>
                </div>
              </>
            )}
          </article>
        </Sheet>
      )}

      {activeForm === 'service' && (
        <Sheet
          title="Record Service"
          onClose={() => setActiveForm('')}
          className="sales-sheet">
          <form className="sheet-form service-form" onSubmit={recordService}>
            <input
              inputMode="decimal"
              placeholder="Amount"
              required
              value={serviceAmount}
              onChange={event => setServiceAmount(event.target.value)}
            />
            <div className="mini-tabs">
              {[
                ['cash', 'Cash'],
                ['bank', 'Bank Transfer'],
              ].map(([key, label]) => (
                <button
                  className={servicePaymentMethod === key ? 'active' : ''}
                  key={key}
                  onClick={() => setServicePaymentMethod(key)}
                  type="button">
                  {label}
                </button>
              ))}
            </div>
            {serviceTypes.length > 0 ? (
              <select
                value={serviceTypeId}
                onChange={event => setServiceTypeId(event.target.value)}>
                {serviceTypes.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="empty-copy">
                No service types yet. Go to Settings to add some.
              </p>
            )}
            <input
              placeholder="Notes"
              value={serviceNotes}
              onChange={event => setServiceNotes(event.target.value)}
            />
            <button
              className="primary-button"
              disabled={serviceTypes.length === 0}
              type="submit">
              Save Service
            </button>
          </form>
        </Sheet>
      )}

      <SectionTitle title={`${getFilterLabel(salesDateFilter)} Transactions`} />
      <div className="mini-tabs transaction-tabs">
        {[
          ['sales', 'Sales'],
          ['services', 'Services'],
          ['both', 'Both'],
        ].map(([key, label]) => (
          <button
            className={transactionView === key ? 'active' : ''}
            key={key}
            onClick={() => setTransactionView(key)}
            type="button">
            {label}
          </button>
        ))}
      </div>
      <div className="activity-list">
        {transactions.length > 0 ? (
          transactions.map(item =>
            item.type === 'sale' ? (
              <Transaction
                key={item.id}
                icon={ShoppingCart}
                title={item.product}
                meta={`Qty ${item.quantity} / ${
                  item.paymentMethod === 'bank' ? 'Bank' : 'Cash'
                } / ${item.time}`}
                amount={`+${formatCurrency(item.total)}`}
                tone="success"
              />
            ) : (
              <Transaction
                key={item.id}
                icon={Receipt}
                title={item.serviceType}
                meta={`${item.paymentMethod === 'bank' ? 'Bank' : 'Cash'} / ${
                  item.time
                }`}
                amount={`+${formatCurrency(item.amount)}`}
                tone="primary"
              />
            ),
          )
        ) : (
          <p className="empty-copy">No transactions recorded for this view.</p>
        )}
      </div>

      {dateSheetOpen && (
        <DateFilterSheet
          current={salesDateFilter}
          onChange={filter => {
            setSalesDateFilter(filter);
            setDateSheetOpen(false);
          }}
          onClose={() => setDateSheetOpen(false)}
        />
      )}
    </section>
  );
}

function Expenses({
  expenses,
  setExpenses,
  overviewDateFilter,
  setOverviewDateFilter,
}) {
  const [category, setCategory] = useState('Transport');
  const [date, setDate] = useState(today);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const f = overviewDateFilter;
  const filteredExpenses = expenses.filter(item =>
    isInRange(item.date, f.start, f.end),
  );
  const monthlyTotal = filteredExpenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  /* previous month for comparison */
  const lastM = getLastMonthRange();
  const prevTotal = expenses
    .filter(item => isInRange(item.date, lastM.start, lastM.end))
    .reduce((sum, item) => sum + item.amount, 0);
  const expenseChange = calcChange(monthlyTotal, prevTotal);

  const heroLabel =
    f.preset === 'month'
      ? `Total Expenses in ${getMonthName(f.start)}`
      : f.preset === 'today'
      ? "Today's Expenses"
      : f.preset === 'week'
      ? "This Week's Expenses"
      : `Expenses (${f.start.slice(5)} – ${f.end.slice(5)})`;

  const saveExpense = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setExpenses(current => [
      {
        id: `e${Date.now()}`,
        category,
        description: data.get('description') || category,
        amount: Number(data.get('amount') || 0),
        date,
        time: getCurrentTime(),
      },
      ...current,
    ]);
    event.currentTarget.reset();
  };

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Expenses" title="Spend" />

      <section className="expense-hero">
        <CardDatePill
          label={getFilterLabel(overviewDateFilter)}
          onClick={() => setDateSheetOpen(true)}
        />
        <span>{heroLabel}</span>
        <strong>{formatCurrency(monthlyTotal)}</strong>
        <ComparisonPill change={expenseChange} label="vs last month" />
      </section>

      <form className="form-card sheet-form" onSubmit={saveExpense}>
        <div className="category-picker">
          <button type="button" onClick={() => setCategorySheetOpen(true)}>
            <span className={`category-dot ${categoryTone(category)}`} />
            <strong>{category}</strong>
            <ChevronDown size={18} />
          </button>
        </div>
        <input name="description" placeholder="Description" required />
        <input
          name="amount"
          inputMode="decimal"
          placeholder="Amount"
          required
        />
        <div className="date-control">
          <button
            type="button"
            onClick={() => setDate(yesterday)}
            aria-label="Previous day">
            <ChevronLeft size={18} />
          </button>
          <input value={date} onChange={event => setDate(event.target.value)} />
          <button type="button" onClick={() => setDate(today)}>
            Today
          </button>
        </div>
        <button className="primary-button" type="submit">
          Save Expense
        </button>
      </form>

      {categorySheetOpen && (
        <Sheet
          title="Select Category"
          onClose={() => setCategorySheetOpen(false)}
          className="category-sheet">
          <div className="category-grid">
            {expenseCategories.map(item => (
              <button
                className={category === item ? 'active' : ''}
                key={item}
                onClick={() => {
                  setCategory(item);
                  setCategorySheetOpen(false);
                }}
                type="button">
                <span className={`category-dot ${categoryTone(item)}`} />
                <strong>{item}</strong>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      <SectionTitle title="Recent Expenses" />
      <div className="activity-list">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map(item => (
            <Transaction
              key={item.id}
              icon={Receipt}
              title={item.category}
              meta={`${item.description} / ${item.time ? `${item.date} \u2022 ${item.time}` : item.date}`}
              amount={`-${formatCurrency(item.amount)}`}
              tone="danger"
            />
          ))
        ) : (
          <p className="empty-copy">No expenses for this period.</p>
        )}
      </div>

      {dateSheetOpen && (
        <DateFilterSheet
          current={overviewDateFilter}
          onChange={filter => {
            setOverviewDateFilter(filter);
            setDateSheetOpen(false);
          }}
          onClose={() => setDateSheetOpen(false)}
        />
      )}
    </section>
  );
}

function categoryTone(category) {
  const tones = {
    Rent: 'blue',
    Utilities: 'green',
    Transport: 'purple',
    'Stock Purchase': 'orange',
    Marketing: 'navy',
    Miscellaneous: 'red',
  };

  return tones[category] || 'navy';
}

const groupDaily = (rows, amountField, outputField) => {
  const grouped = rows.reduce((acc, item) => {
    acc[item.date] = (acc[item.date] || 0) + Number(item[amountField] || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      day: date.slice(5),
      [outputField]: value,
    }));
};

const groupTotals = (rows, labelField, amountField) => {
  const colors = ['#1f3a5f', '#12a66a', '#e6a122', '#2563eb', '#7c3aed'];
  const grouped = rows.reduce((acc, item) => {
    acc[item[labelField]] =
      (acc[item[labelField]] || 0) + Number(item[amountField] || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((left, right) => right[1] - left[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
};

const groupCounts = (rows, labelField) => {
  const grouped = rows.reduce((acc, item) => {
    acc[item[labelField]] = (acc[item[labelField]] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((left, right) => right[1] - left[1])
    .map(([name, value]) => ({name, value}));
};

const groupProfitTrend = (sales, services, expenses) => {
  const grouped = {};

  sales.forEach(item => {
    grouped[item.date] = grouped[item.date] || {revenue: 0, expenses: 0};
    grouped[item.date].revenue += Number(item.total || 0);
  });
  services.forEach(item => {
    grouped[item.date] = grouped[item.date] || {revenue: 0, expenses: 0};
    grouped[item.date].revenue += Number(item.amount || 0);
  });
  expenses.forEach(item => {
    grouped[item.date] = grouped[item.date] || {revenue: 0, expenses: 0};
    grouped[item.date].expenses += Number(item.amount || 0);
  });

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      day: date.slice(5),
      profit: value.revenue - value.expenses,
    }));
};

function Reports({
  products,
  sales,
  services,
  expenses,
  expenseAllocation,
  salesExpensePercent,
  servicesExpensePercent,
  overviewDateFilter,
  setOverviewDateFilter,
  navigate,
}) {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const inRange = item =>
    isInRange(item.date, overviewDateFilter.start, overviewDateFilter.end);
  const rangeSales = sales.filter(inRange);
  const rangeServices = services.filter(inRange);
  const rangeExpenses = expenses.filter(inRange);
  const totalExpenses = rangeExpenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const salesRevenue = rangeSales.reduce((sum, item) => sum + item.total, 0);
  const serviceRevenue = rangeServices.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const salesCash = rangeSales
    .filter(item => (item.paymentMethod || 'cash') === 'cash')
    .reduce((sum, item) => sum + item.total, 0);
  const salesBank = rangeSales
    .filter(item => item.paymentMethod === 'bank')
    .reduce((sum, item) => sum + item.total, 0);
  const servicesCash = rangeServices
    .filter(item => (item.paymentMethod || 'cash') === 'cash')
    .reduce((sum, item) => sum + item.amount, 0);
  const servicesBank = rangeServices
    .filter(item => item.paymentMethod === 'bank')
    .reduce((sum, item) => sum + item.amount, 0);
  const cogs = rangeSales.reduce((sum, sale) => {
    const product = products.find(item => item.id === sale.productId);
    return (
      sum +
      (Number(sale.cogs || 0) > 0
        ? Number(sale.cogs || 0)
        : Number(product?.purchasePrice ?? product?.costPrice ?? 0) *
          Number(sale.quantity || 0))
    );
  }, 0);
  const grossProfit = salesRevenue - cogs;
  const salesExpense =
    expenseAllocation === 'split'
      ? totalExpenses * (Number(salesExpensePercent || 0) / 100)
      : totalExpenses;
  const serviceExpense =
    expenseAllocation === 'split'
      ? totalExpenses * (Number(servicesExpensePercent || 0) / 100)
      : totalExpenses;
  const totalRevenue = salesRevenue + serviceRevenue;
  const netSalesProfit = grossProfit - salesExpense;
  const netServiceProfit = serviceRevenue - serviceExpense;
  const netBusinessProfit = totalRevenue - totalExpenses;
  const bestSellingProduct =
    rangeSales.reduce(
      (best, item) => (item.quantity > (best?.quantity || 0) ? item : best),
      null,
    )?.product || 'None';
  const serviceTypeRevenue = groupTotals(
    rangeServices,
    'serviceType',
    'amount',
  );
  const mostPopularServiceType =
    groupCounts(rangeServices, 'serviceType')[0]?.name || 'None';
  const salesDaily = groupDaily(rangeSales, 'total', 'sales');
  const servicesDaily = groupDaily(rangeServices, 'amount', 'services');
  const profitTrend = groupProfitTrend(
    rangeSales,
    rangeServices,
    rangeExpenses,
  );

  /* previous period for comparison */
  const lastM = getLastMonthRange();
  const prevSales = sales.filter(item =>
    isInRange(item.date, lastM.start, lastM.end),
  );
  const prevServices = services.filter(item =>
    isInRange(item.date, lastM.start, lastM.end),
  );
  const prevExpenses = expenses.filter(item =>
    isInRange(item.date, lastM.start, lastM.end),
  );

  const prevTotalExpenses = prevExpenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const prevSalesRevenue = prevSales.reduce((sum, item) => sum + item.total, 0);
  const prevServiceRevenue = prevServices.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const prevCogs = prevSales.reduce((sum, sale) => {
    const product = products.find(item => item.id === sale.productId);
    return (
      sum +
      (Number(sale.cogs || 0) > 0
        ? Number(sale.cogs || 0)
        : Number(product?.purchasePrice ?? product?.costPrice ?? 0) *
          Number(sale.quantity || 0))
    );
  }, 0);
  const prevGrossProfit = prevSalesRevenue - prevCogs;

  const prevSalesExpense =
    expenseAllocation === 'split'
      ? prevTotalExpenses * (Number(salesExpensePercent || 0) / 100)
      : prevTotalExpenses;
  const prevServiceExpense =
    expenseAllocation === 'split'
      ? prevTotalExpenses * (Number(servicesExpensePercent || 0) / 100)
      : prevTotalExpenses;

  const prevNetSalesProfit = prevGrossProfit - prevSalesExpense;
  const prevNetServiceProfit = prevServiceRevenue - prevServiceExpense;
  const prevNetBusinessProfit =
    prevSalesRevenue + prevServiceRevenue - prevTotalExpenses;

  const salesChange = calcChange(netSalesProfit, prevNetSalesProfit);
  const serviceChange = calcChange(netServiceProfit, prevNetServiceProfit);
  const businessChange = calcChange(netBusinessProfit, prevNetBusinessProfit);

  const heroProps =
    activeTab === 'sales'
      ? {label: 'Net Sales Profit', value: netSalesProfit, change: salesChange}
      : activeTab === 'services'
      ? {
          label: 'Net Service Profit',
          value: netServiceProfit,
          change: serviceChange,
        }
      : {
          label: 'Net Business Profit',
          value: netBusinessProfit,
          change: businessChange,
        };

  return (
    <section className="screen animate-in">
      <ScreenHeader
        eyebrow="Reports"
        title="Insights"
        action={
          <button
            className="transaction-entry-button"
            type="button"
            onClick={() => navigate('transactions')}>
            <History size={16} strokeWidth={2.4} />
            <span>Transactions</span>
          </button>
        }
      />

      <ReportHero
        label={heroProps.label}
        value={heroProps.value}
        filterLabel={getFilterLabel(overviewDateFilter)}
        onFilterClick={() => setDateSheetOpen(true)}
        change={heroProps.change}
      />

      <div className="mini-tabs report-tabs">
        {[
          ['sales', 'Sales'],
          ['services', 'Services'],
          ['combined', 'Combined'],
        ].map(([key, label]) => (
          <button
            className={activeTab === key ? 'active' : ''}
            key={key}
            onClick={() => setActiveTab(key)}
            type="button">
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && (
        <>
          <article className="chart-card">
            <div className="chart-heading">
              <h2>Daily Sales</h2>
              <span>{bestSellingProduct}</span>
            </div>
            <ReportBarChart data={salesDaily} dataKey="sales" color="#2563eb" />
          </article>
          <article className="chart-card">
            <div className="chart-heading">
              <h2>Sales Payment Split</h2>
              <span>{formatCurrency(salesRevenue)}</span>
            </div>
            <ReportPieChart
              data={[
                {name: 'Cash', value: salesCash, color: '#12a66a'},
                {name: 'Bank', value: salesBank, color: '#2563eb'},
              ]}
            />
          </article>
          <ReportSummary
            rows={[
              ['Sales Revenue', salesRevenue],
              ['Cash received from sales', salesCash],
              ['Bank received from sales', salesBank],
              ['Cost of goods sold', cogs],
              ['Gross profit', grossProfit],
              ['Allocated expenses', salesExpense],
            ]}
          />
          <article className="pnl-card report-detail-card">
            <InfoRow label="Best selling product" value={bestSellingProduct} />
            <InfoRow
              label="Expense allocation"
              value={
                expenseAllocation === 'split'
                  ? `${salesExpensePercent}% of expenses`
                  : 'All expenses'
              }
            />
          </article>
        </>
      )}

      {activeTab === 'services' && (
        <>
          <article className="chart-card">
            <div className="chart-heading">
              <h2>Daily Service Revenue</h2>
              <span>{mostPopularServiceType}</span>
            </div>
            <ReportBarChart
              data={servicesDaily}
              dataKey="services"
              color="#12a66a"
            />
          </article>
          <article className="chart-card">
            <div className="chart-heading">
              <h2>Revenue by Service Type</h2>
              <span>{formatCurrency(serviceRevenue)}</span>
            </div>
            <ReportPieChart data={serviceTypeRevenue} />
          </article>
          <ReportSummary
            rows={[
              ['Total service revenue', serviceRevenue],
              ['Cash received from services', servicesCash],
              ['Bank received from services', servicesBank],
              ['Allocated expenses', serviceExpense],
            ]}
          />
          <article className="pnl-card report-detail-card">
            <InfoRow
              label="Most popular service type"
              value={mostPopularServiceType}
            />
            <InfoRow
              label="Expense allocation"
              value={
                expenseAllocation === 'split'
                  ? `${servicesExpensePercent}% of expenses`
                  : 'All expenses'
              }
            />
          </article>
          <article className="pnl-card report-detail-card">
            {rangeServices.length > 0 ? (
              rangeServices.map(item => (
                <InfoRow
                  key={item.id}
                  label={`${item.serviceType} / ${
                    item.paymentMethod === 'bank' ? 'Bank' : 'Cash'
                  }`}
                  value={formatCurrency(item.amount)}
                />
              ))
            ) : (
              <p className="empty-copy">
                No service transactions in this range.
              </p>
            )}
          </article>
        </>
      )}

      {activeTab === 'combined' && (
        <>
          <article className="chart-card">
            <div className="chart-heading">
              <h2>Profit Trend</h2>
              <span>
                {overviewDateFilter.start.slice(5)} -{' '}
                {overviewDateFilter.end.slice(5)}
              </span>
            </div>
            <ReportBarChart
              data={profitTrend}
              dataKey="profit"
              color="#1f3a5f"
            />
          </article>
          <article className="chart-card">
            <div className="chart-heading">
              <h2>Revenue Split</h2>
              <span>{formatCurrency(totalRevenue)}</span>
            </div>
            <ReportPieChart
              data={[
                {name: 'Sales', value: salesRevenue, color: '#2563eb'},
                {name: 'Services', value: serviceRevenue, color: '#12a66a'},
              ]}
            />
          </article>
          <ReportSummary
            rows={[
              ['Total Revenue', totalRevenue],
              ['Total Cash received', salesCash + servicesCash],
              ['Total Bank received', salesBank + servicesBank],
              ['Total Expenses', totalExpenses],
            ]}
          />
        </>
      )}

      {dateSheetOpen && (
        <DateFilterSheet
          current={overviewDateFilter}
          onChange={filter => {
            setOverviewDateFilter(filter);
            setDateSheetOpen(false);
          }}
          onClose={() => setDateSheetOpen(false)}
        />
      )}
    </section>
  );
}

function buildLedgerTransactions({products, sales, services, expenses}) {
  const getProduct = productId => products.find(item => item.id === productId);

  return [
    ...sales.map(item => {
      const product = getProduct(item.productId);
      return {
        id: `sale-${item.id}`,
        type: 'sales',
        typeLabel: 'Sales',
        description: item.product || product?.name || 'Deleted product',
        sku: product?.sku || item.productId || '',
        meta: `${item.quantity} unit${Number(item.quantity) === 1 ? '' : 's'}`,
        amount: Number(item.total || 0),
        direction: 'in',
        paymentMethod: item.paymentMethod || 'cash',
        date: item.date,
        time: item.time,
        icon: ShoppingCart,
      };
    }),
    ...services.map(item => ({
      id: `service-${item.id}`,
      type: 'services',
      typeLabel: 'Services',
      description: item.serviceType || 'Service',
      sku: '',
      meta: item.notes || 'Service income',
      amount: Number(item.amount || 0),
      direction: 'in',
      paymentMethod: item.paymentMethod || 'cash',
      date: item.date,
      time: item.time,
      icon: Activity,
    })),
    ...expenses.map(item => {
      const isPurchase = item.category === 'Stock Purchase';
      return {
        id: `expense-${item.id}`,
        type: isPurchase ? 'purchases' : 'expenses',
        typeLabel: isPurchase ? 'Stock Purchases' : 'Expenses',
        description: item.description || item.category,
        sku: '',
        meta: item.category || 'Expense',
        amount: Number(item.amount || 0),
        direction: 'out',
        paymentMethod: item.paymentMethod || 'cash',
        date: item.date,
        time: item.time,
        icon: isPurchase ? Package : Receipt,
      };
    }),
  ];
}

function buildPdfFileName(start, end) {
  return `transaction-statement-${start}-to-${end}.pdf`;
}

function addPdfPageIfNeeded(doc, y) {
  if (y <= 276) {
    return y;
  }

  doc.addPage();
  return 18;
}

function downloadStatementPdf({
  business,
  closingBalance,
  periodLabel,
  rows,
  start,
  end,
}) {
  const doc = new jsPDF({unit: 'mm', format: 'a4'});
  let y = 18;

  doc.setTextColor('#1f3a5f');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(business.name || 'TradeEase Business', 16, y);
  doc.setFontSize(10);
  doc.setTextColor('#667085');
  doc.text(`TIN: ${business.taxId || 'Not provided'}`, 16, y + 7);
  doc.text('TRANSACTION STATEMENT', 146, y);
  doc.text(`Generated ${new Date().toLocaleString()}`, 146, y + 7);

  y += 18;
  doc.setDrawColor('#1f3a5f');
  doc.setLineWidth(0.6);
  doc.line(16, y, 194, y);

  y += 12;
  doc.setTextColor('#111827');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Statement Period', 16, y);
  doc.text('Transactions', 78, y);
  doc.text('Closing Balance', 132, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#667085');
  doc.text(periodLabel, 16, y + 7);
  doc.text(String(rows.length), 78, y + 7);
  doc.setTextColor(closingBalance >= 0 ? '#12a66a' : '#dc3f2f');
  doc.text(`NGN ${formatPdfCurrency(closingBalance)}`, 132, y + 7);

  y += 20;
  doc.setFillColor('#1f3a5f');
  doc.rect(16, y, 178, 9, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DATE / TIME', 18, y + 6);
  doc.text('TYPE', 52, y + 6);
  doc.text('DESCRIPTION', 82, y + 6);
  doc.text('METHOD', 150, y + 6);
  doc.text('AMOUNT', 192, y + 6, {align: 'right'});

  y += 13;
  doc.setFontSize(8);

  if (rows.length === 0) {
    doc.setTextColor('#667085');
    doc.setFont('helvetica', 'normal');
    doc.text('No transactions match the selected export dates.', 16, y);
  }

  rows.forEach(item => {
    y = addPdfPageIfNeeded(doc, y);

    const signed = item.direction === 'in' ? item.amount : -item.amount;
    const description = item.sku
      ? `${item.description} / SKU: ${item.sku}`
      : item.description;
    const descriptionLines = doc.splitTextToSize(description, 58);
    const metaLines = doc.splitTextToSize(item.meta || '', 58);
    const rowHeight = Math.max(
      11,
      5 + (descriptionLines.length + metaLines.length) * 4,
    );

    doc.setDrawColor('#e2e8f0');
    doc.line(16, y - 4, 194, y - 4);
    doc.setTextColor('#111827');
    doc.setFont('helvetica', 'normal');
    doc.text(formatLedgerDate(item.date, item.time), 18, y);
    doc.text(item.typeLabel, 52, y);
    doc.setFont('helvetica', 'bold');
    doc.text(descriptionLines, 82, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#667085');
    doc.text(metaLines, 82, y + descriptionLines.length * 4);
    doc.setTextColor('#111827');
    doc.text(item.paymentMethod === 'bank' ? 'Bank' : 'Cash', 150, y);
    doc.setTextColor(signed >= 0 ? '#12a66a' : '#dc3f2f');
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${signed >= 0 ? '+' : '-'}NGN ${formatPdfCurrency(Math.abs(signed))}`,
      192,
      y,
      {align: 'right'},
    );

    y += rowHeight;
  });

  doc.save(buildPdfFileName(start, end));
}

function TransactionHistory({
  products,
  sales,
  services,
  expenses,
  business,
  onBack,
}) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(makeDateFilter('month'));
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [exportStart, setExportStart] = useState(dateFilter.start);
  const [exportEnd, setExportEnd] = useState(dateFilter.end);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const ledgerRows = buildLedgerTransactions({
    products,
    sales,
    services,
    expenses,
  });
  const sortRows = rows =>
    [...rows].sort((left, right) => {
      const compare = `${left.date} ${left.time || ''}`.localeCompare(
        `${right.date} ${right.time || ''}`,
      );
      return sortOrder === 'desc' ? -compare : compare;
    });

  const filteredByTypeAndSearch = ledgerRows
    .filter(item => typeFilter === 'all' || item.type === typeFilter)
    .filter(item => {
      const needle = query.trim().toLowerCase();
      if (!needle) {
        return true;
      }
      return [item.description, item.sku, item.meta, item.typeLabel]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

  const filteredRows = sortRows(
    filteredByTypeAndSearch.filter(item =>
      isInRange(item.date, dateFilter.start, dateFilter.end),
    ),
  );

  const closingBalance = filteredRows.reduce(
    (sum, item) =>
      sum + (item.direction === 'in' ? item.amount : -Number(item.amount || 0)),
    0,
  );

  const exportStatement = () => {
    if (!exportStart || !exportEnd || exportStart > exportEnd) {
      return;
    }

    const exportRows = sortRows(
      filteredByTypeAndSearch.filter(item =>
        isInRange(item.date, exportStart, exportEnd),
      ),
    );
    const exportBalance = exportRows.reduce(
      (sum, item) =>
        sum +
        (item.direction === 'in' ? item.amount : -Number(item.amount || 0)),
      0,
    );
    const exportPeriodLabel = `${exportStart} to ${exportEnd}`;

    downloadStatementPdf({
      business,
      closingBalance: exportBalance,
      periodLabel: exportPeriodLabel,
      rows: exportRows,
      start: exportStart,
      end: exportEnd,
    });
    setExportSheetOpen(false);
  };

  const filterOptions = [
    ['all', 'All'],
    ['sales', 'Sales'],
    ['services', 'Services'],
    ['purchases', 'Stock Purchases'],
    ['expenses', 'Expenses'],
  ];

  return (
    <section className="screen transaction-screen animate-in">
      <ScreenHeader
        eyebrow="Reports"
        title="Transaction History"
        action={
          <div className="header-actions">
            <button
              aria-label="Export PDF"
              className="transaction-export-button"
              type="button"
              onClick={() => {
                setExportStart(dateFilter.start);
                setExportEnd(dateFilter.end);
                setExportSheetOpen(true);
              }}>
              <Download size={16} strokeWidth={2.4} />
              <span>Export PDF</span>
            </button>
            <button
              aria-label="Back to reports"
              className="header-add-button"
              type="button"
              onClick={onBack}>
              <ChevronLeft size={22} strokeWidth={2.4} />
            </button>
          </div>
        }
      />

      <section className="statement-summary-card">
        <CardDatePill
          label={getFilterLabel(dateFilter)}
          onClick={() => setDateSheetOpen(true)}
        />
        <span>Closing Balance</span>
        <strong
          className={
            closingBalance >= 0 ? 'statement-credit' : 'statement-debit'
          }>
          {formatCurrency(closingBalance)}
        </strong>
        <small>
          {filteredRows.length} transaction
          {filteredRows.length === 1 ? '' : 's'}
        </small>
      </section>

      <label className="search-field transaction-search">
        <Search size={18} />
        <input
          placeholder="Search description or SKU"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </label>

      <div className="ledger-filter-row">
        {filterOptions.map(([key, label]) => (
          <button
            className={typeFilter === key ? 'active' : ''}
            key={key}
            type="button"
            onClick={() => setTypeFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <button
        className="ledger-sort-button"
        type="button"
        onClick={() =>
          setSortOrder(current => (current === 'desc' ? 'asc' : 'desc'))
        }>
        <RefreshCw size={15} />
        {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
      </button>

      <div className="ledger-list">
        {filteredRows.length > 0 ? (
          filteredRows.map(item => {
            const Icon = item.icon;
            const isCredit = item.direction === 'in';
            return (
              <article className="ledger-row" key={item.id}>
                <span
                  className={`ledger-icon ${isCredit ? 'credit' : 'debit'}`}>
                  <Icon size={19} strokeWidth={2.35} />
                </span>
                <span className="ledger-copy">
                  <span className="ledger-title-line">
                    <strong>{item.description}</strong>
                    <em>{item.typeLabel}</em>
                  </span>
                  <small>
                    {item.sku ? `SKU: ${item.sku} / ` : ''}
                    {item.meta}
                  </small>
                  <span className="ledger-meta-line">
                    <i>{formatLedgerDate(item.date, item.time)}</i>
                    <b>{item.paymentMethod === 'bank' ? 'Bank' : 'Cash'}</b>
                  </span>
                </span>
                <strong
                  className={`ledger-amount ${
                    isCredit ? 'statement-credit' : 'statement-debit'
                  }`}>
                  {isCredit ? '+' : '-'}
                  {formatCurrency(item.amount)}
                </strong>
              </article>
            );
          })
        ) : (
          <p className="empty-copy ledger-empty">
            No transactions match the current filters.
          </p>
        )}
      </div>

      {dateSheetOpen && (
        <DateFilterSheet
          current={dateFilter}
          onChange={filter => {
            setDateFilter(filter);
            setDateSheetOpen(false);
          }}
          onClose={() => setDateSheetOpen(false)}
        />
      )}

      {exportSheetOpen && (
        <Sheet
          title="Export PDF Statement"
          onClose={() => setExportSheetOpen(false)}
          className="settings-sheet locked-sheet">
          <div className="custom-range export-range-card">
            <strong>Statement Date Range</strong>
            <div className="custom-range-inputs">
              <label>
                <small>Begin date</small>
                <input
                  type="date"
                  value={exportStart}
                  onChange={event => setExportStart(event.target.value)}
                />
              </label>
              <label>
                <small>End date</small>
                <input
                  type="date"
                  value={exportEnd}
                  onChange={event => setExportEnd(event.target.value)}
                />
              </label>
            </div>
            {exportStart && exportEnd && exportStart > exportEnd ? (
              <p className="settings-error">
                Begin date cannot be after end date.
              </p>
            ) : null}
            <button
              className="primary-button"
              disabled={!exportStart || !exportEnd || exportStart > exportEnd}
              type="button"
              onClick={exportStatement}>
              Download PDF
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}

function ReportSummary({rows}) {
  return (
    <article className="pnl-card report-summary-card">
      {rows.map(([label, value]) => (
        <InfoRow key={label} label={label} value={formatCurrency(value)} />
      ))}
    </article>
  );
}

function ReportHero({label, value, filterLabel, onFilterClick, change}) {
  return (
    <section className="profit-card">
      <CardDatePill label={filterLabel} onClick={onFilterClick} />
      <div className="eyebrow-row">
        <TrendingUp size={18} />
        <span>{label}</span>
      </div>
      <strong>{formatCurrency(value)}</strong>
      {change && <ComparisonPill change={change} label="vs last month" glass />}
    </section>
  );
}

function ReportBarChart({data, dataKey, color}) {
  if (!data.length) {
    return <p className="empty-copy">No data available for this date range.</p>;
  }

  return (
    <div className="rechart-box">
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} barGap={6}>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{fontSize: 10, fill: '#667085'}}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{fill: 'rgba(31,58,95,0.06)'}}
          />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReportPieChart({data}) {
  const chartData = data.filter(item => Number(item.value || 0) > 0);

  if (!chartData.length) {
    return <p className="empty-copy">No chart data available.</p>;
  }

  return (
    <div className="breakdown-layout">
      <ResponsiveContainer width="42%" height={150}>
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={36}
            outerRadius={66}
            paddingAngle={3}>
            {chartData.map((item, index) => (
              <Cell
                key={item.name}
                fill={
                  item.color ||
                  ['#1f3a5f', '#12a66a', '#e6a122', '#2563eb'][index % 4]
                }
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="breakdown-list">
        {chartData.map((item, index) => (
          <div className="breakdown-row" key={item.name}>
            <span>
              <i
                style={{
                  backgroundColor:
                    item.color ||
                    ['#1f3a5f', '#12a66a', '#e6a122', '#2563eb'][index % 4],
                }}
              />
              {item.name}
            </span>
            <strong>{formatCurrency(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartTooltip({active, payload, label}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      {label && <strong>{label}</strong>}
      {payload.map(item => (
        <span key={item.name || item.dataKey}>
          <i style={{backgroundColor: item.color || item.payload?.color}} />
          {item.name || item.dataKey}: {formatCurrency(item.value)}
        </span>
      ))}
    </div>
  );
}

function SettingsScreen({
  products,
  sales,
  serviceTypes,
  setServiceTypes,
  expenses,
  userName,
  business,
  onSaveBusiness,
  onLogout,
  balanceDisplay,
  setBalanceDisplay,
  expenseAllocation,
  setExpenseAllocation,
  salesExpensePercent,
  setSalesExpensePercent,
  servicesExpensePercent,
  setServicesExpensePercent,
}) {
  const [activePanel, setActivePanel] = useState('');
  const [newServiceType, setNewServiceType] = useState('');
  const [serviceTypeError, setServiceTypeError] = useState('');
  const [allocationError, setAllocationError] = useState('');
  const [profile, setProfile] = useState({
    name: userName,
    email: 'testing18@tradeease.local',
    phone: '+234 800 000 0000',
  });
  const [syncPreferences, setSyncPreferences] = useState({
    cloudBackup: true,
    autoSync: true,
    offlineMode: true,
  });
  const [security, setSecurity] = useState({
    pinEnabled: true,
    deviceLock: true,
    recoveryEmail: 'testing18@tradeease.local',
  });
  const [syncStatus, setSyncStatus] = useState('Synced');
  const [lastSync, setLastSync] = useState('May 8, 2026, 5:51 PM');
  const pendingCounts = {
    products: products.filter(item => item.quantity < item.threshold).length,
    sales: sales.length,
    expenses: expenses.length,
  };
  const totalPending =
    pendingCounts.products + pendingCounts.sales + pendingCounts.expenses;

  const closePanel = () => setActivePanel('');

  const addServiceType = event => {
    event.preventDefault();
    const name = newServiceType.trim();
    const duplicate = serviceTypes.some(
      item => item.name.toLowerCase() === name.toLowerCase(),
    );

    if (!name) {
      setServiceTypeError('Service type name is required.');
      return;
    }

    if (duplicate) {
      setServiceTypeError('This service type already exists.');
      return;
    }

    setServiceTypes(current => [{id: `st${Date.now()}`, name}, ...current]);
    setNewServiceType('');
    setServiceTypeError('');
  };

  const deleteServiceType = id => {
    setServiceTypes(current => current.filter(item => item.id !== id));
  };

  const updateSalesPercent = value => {
    const nextSales = Number(value || 0);
    const currentServices = Number(servicesExpensePercent || 0);
    setSalesExpensePercent(value);
    setAllocationError(
      nextSales + currentServices === 100
        ? ''
        : 'Sales and Services percentages must add up to 100.',
    );
  };

  const updateServicesPercent = value => {
    const nextServices = Number(value || 0);
    const currentSales = Number(salesExpensePercent || 0);
    setServicesExpensePercent(value);
    setAllocationError(
      currentSales + nextServices === 100
        ? ''
        : 'Sales and Services percentages must add up to 100.',
    );
  };

  const handleProfileSave = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setProfile({
      name: data.get('name') || profile.name,
      email: data.get('email') || profile.email,
      phone: data.get('phone') || profile.phone,
    });
    closePanel();
  };

  const handleSyncPreferencesSave = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSyncPreferences({
      cloudBackup: data.has('cloudBackup'),
      autoSync: data.has('autoSync'),
      offlineMode: data.has('offlineMode'),
    });
    closePanel();
  };

  const handleSecuritySave = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSecurity({
      pinEnabled: data.has('pinEnabled'),
      deviceLock: data.has('deviceLock'),
      recoveryEmail: data.get('recoveryEmail') || security.recoveryEmail,
    });
    closePanel();
  };

  const handleManualSync = () => {
    if (syncStatus === 'Syncing...') {
      return;
    }

    setSyncStatus('Syncing...');
    window.setTimeout(() => {
      setLastSync(
        new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      );
      setSyncStatus('Synced');
    }, 650);
  };

  const serviceSubLabel =
    serviceTypes.length > 0
      ? `${serviceTypes.length} service type${
          serviceTypes.length !== 1 ? 's' : ''
        } configured`
      : 'Customize your service offerings';

  const balanceLabels = {
    separate: 'Separate Sales & Services',
    combined: 'Combined view',
    services_only: 'Services only',
  };

  const expenseLabels = {
    combined: 'All Expenses',
    split: 'Split Expenses',
  };

  const balanceSubLabel = `Currently: ${
    balanceLabels[balanceDisplay] || 'Separate Sales & Services'
  }`;
  const profitSubLabel = `Currently: ${
    expenseLabels[expenseAllocation] || 'All Expenses'
  }`;

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Settings" title="Settings" />

      <SettingsGroup title="Account">
        <SettingsRow
          icon={User}
          tone="user"
          title="Personal Info"
          description="Profile, email, and contact details"
          onClick={() => setActivePanel('profile')}
        />
        <SettingsRow
          icon={Building2}
          tone="business"
          title="Business Details"
          description="Company, tax, and receipt information"
          onClick={() => setActivePanel('business')}
        />
      </SettingsGroup>

      <SettingsGroup title="Business Configuration">
        <SettingsRow
          icon={Layers}
          tone="services"
          title="Service Types"
          description={serviceSubLabel}
          onClick={() => setActivePanel('service-types')}
        />
        <SettingsRow
          icon={LayoutGrid}
          tone="balance"
          title="Balance Display"
          description={balanceSubLabel}
          onClick={() => setActivePanel('balance-display')}
        />
        <SettingsRow
          icon={PieChartIcon}
          tone="profit"
          title="Profit Calculation"
          description={profitSubLabel}
          onClick={() => setActivePanel('profit-calc')}
        />
      </SettingsGroup>

      <SettingsGroup title="Operations">
        <SettingsRow
          icon={CloudRefresh}
          tone="sync"
          title="Sync Settings"
          description="Cloud backup and offline records"
          trailing={
            <span className="settings-badge">
              <i />
              {syncStatus}
            </span>
          }
          onClick={() => setActivePanel('sync')}
        />

        <article className="settings-sync-panel">
          <div className="settings-sync-top">
            <span className="soft-icon success">
              <Wifi size={22} />
            </span>
            <div>
              <small>Connectivity</small>
              <strong>Online</strong>
            </div>
            <em>web</em>
          </div>
          <div className="settings-sync-counts">
            <InfoRow label="Products" value={pendingCounts.products} />
            <InfoRow label="Sales" value={pendingCounts.sales} />
            <InfoRow label="Expenses" value={pendingCounts.expenses} />
          </div>
          <div className="sync-total">
            <span>Total pending</span>
            <strong>{totalPending}</strong>
          </div>
          <div className="last-sync settings-last-sync">
            <span className="soft-icon success">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <small>Last Sync</small>
              <strong>{lastSync}</strong>
            </div>
          </div>
          <button
            className="primary-button sync-button"
            type="button"
            onClick={handleManualSync}
            disabled={syncStatus === 'Syncing...'}>
            <RefreshCw size={18} />
            {syncStatus === 'Syncing...' ? 'Syncing...' : 'Manual Sync'}
          </button>
        </article>

        <SettingsRow
          icon={ShieldCheck}
          tone="security"
          title="Security"
          description="Password, PIN, and device protection"
          onClick={() => setActivePanel('security')}
        />
      </SettingsGroup>

      <button className="logout-button" type="button" onClick={onLogout}>
        <LogOut size={18} />
        Logout
      </button>

      <footer className="settings-version">TradeEase v1.0.0</footer>

      {activePanel === 'profile' && (
        <Sheet
          title="Personal Info"
          onClose={closePanel}
          className="settings-sheet">
          <form className="sheet-form" onSubmit={handleProfileSave}>
            <input
              name="name"
              defaultValue={profile.name}
              placeholder="Full name"
              required
            />
            <input
              name="email"
              defaultValue={profile.email}
              placeholder="Email address"
              type="email"
              required
            />
            <input
              name="phone"
              defaultValue={profile.phone}
              placeholder="Phone number"
            />
            <button className="primary-button" type="submit">
              Save Personal Info
            </button>
          </form>
        </Sheet>
      )}

      {activePanel === 'business' && (
        <BusinessDetailsSheet
          business={business}
          onClose={closePanel}
          onSave={onSaveBusiness}
        />
      )}

      {activePanel === 'sync' && (
        <Sheet
          title="Sync Settings"
          onClose={closePanel}
          className="settings-sheet sync-settings-sheet locked-sheet">
          <form className="sheet-form" onSubmit={handleSyncPreferencesSave}>
            <ToggleRow
              name="cloudBackup"
              title="Cloud backup"
              description="Back up sales, stock, and expenses"
              defaultChecked={syncPreferences.cloudBackup}
            />
            <ToggleRow
              name="autoSync"
              title="Auto sync"
              description="Sync automatically when online"
              defaultChecked={syncPreferences.autoSync}
            />
            <ToggleRow
              name="offlineMode"
              title="Offline records"
              description="Keep new records on this device first"
              defaultChecked={syncPreferences.offlineMode}
            />
            <div className="sheet-action-bar">
              <button className="primary-button" type="submit">
                Save Sync Settings
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {activePanel === 'security' && (
        <Sheet title="Security" onClose={closePanel} className="settings-sheet">
          <form className="sheet-form" onSubmit={handleSecuritySave}>
            <ToggleRow
              name="pinEnabled"
              title="PIN protection"
              description="Require a PIN before opening TradeEase"
              defaultChecked={security.pinEnabled}
            />
            <ToggleRow
              name="deviceLock"
              title="Device lock"
              description="Use this device security when available"
              defaultChecked={security.deviceLock}
            />
            <input
              name="recoveryEmail"
              defaultValue={security.recoveryEmail}
              placeholder="Recovery email"
              type="email"
            />
            <input
              name="newPassword"
              placeholder="New password"
              type="password"
            />
            <button className="primary-button" type="submit">
              Save Security
            </button>
          </form>
        </Sheet>
      )}

      {activePanel === 'service-types' && (
        <Sheet
          title="Service Types"
          onClose={closePanel}
          className="settings-sheet">
          <div className="settings-inline-panel">
            <form className="settings-add-form" onSubmit={addServiceType}>
              <input
                value={newServiceType}
                onChange={event => {
                  setNewServiceType(event.target.value);
                  setServiceTypeError('');
                }}
                placeholder="Add service type"
              />
              <button type="submit">Add</button>
            </form>
            {serviceTypeError ? (
              <p className="settings-error">{serviceTypeError}</p>
            ) : null}
            <div className="service-type-list">
              {serviceTypes.length > 0 ? (
                serviceTypes.map(item => (
                  <div className="service-type-row" key={item.id}>
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteServiceType(item.id)}>
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No service types added yet.</p>
              )}
            </div>
          </div>
        </Sheet>
      )}

      {activePanel === 'balance-display' && (
        <Sheet
          title="Balance Card Display"
          onClose={closePanel}
          className="settings-sheet locked-sheet">
          <div className="settings-radio-panel">
            {[
              ['separate', 'Show Sales and Services separately'],
              ['combined', 'Combine Sales and Services together'],
              ['services_only', 'Show Services only'],
            ].map(([value, label]) => (
              <label className="settings-radio-row" key={value}>
                <input
                  checked={balanceDisplay === value}
                  name="balanceDisplay"
                  onChange={() => setBalanceDisplay(value)}
                  type="radio"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </Sheet>
      )}

      {activePanel === 'profit-calc' && (
        <Sheet
          title="Profit Calculation"
          onClose={closePanel}
          className="settings-sheet locked-sheet">
          <div className="settings-radio-panel">
            {[
              ['combined', 'All expenses apply to total business'],
              ['split', 'Split expenses between Sales and Services'],
            ].map(([value, label]) => (
              <label className="settings-radio-row" key={value}>
                <input
                  checked={expenseAllocation === value}
                  name="expenseAllocation"
                  onChange={() => {
                    setExpenseAllocation(value);
                    setAllocationError('');
                  }}
                  type="radio"
                />
                <span>{label}</span>
              </label>
            ))}
            {expenseAllocation === 'split' && (
              <div className="settings-percent-grid">
                <label>
                  <span>Sales percentage</span>
                  <input
                    value={salesExpensePercent}
                    onChange={event => updateSalesPercent(event.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  <span>Services percentage</span>
                  <input
                    value={servicesExpensePercent}
                    onChange={event =>
                      updateServicesPercent(event.target.value)
                    }
                    inputMode="numeric"
                  />
                </label>
              </div>
            )}
            {allocationError ? (
              <p className="settings-error">{allocationError}</p>
            ) : null}
          </div>
        </Sheet>
      )}
    </section>
  );
}

function SettingsGroup({title, children}) {
  return (
    <section className="settings-group">
      <h2>{title}</h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}

function BusinessDetailsSheet({business, onClose, onSave}) {
  const handleSubmit = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      name: data.get('name') || business.name,
      taxId: data.get('taxId') || business.taxId,
      receiptPrefix: data.get('receiptPrefix') || business.receiptPrefix,
    });
    onClose();
  };

  return (
    <Sheet
      title="Business Details"
      onClose={onClose}
      className="settings-sheet locked-sheet">
      <form className="sheet-form" onSubmit={handleSubmit}>
        <input
          name="name"
          defaultValue={business.name}
          placeholder="Business name"
          required
        />
        <input
          name="taxId"
          defaultValue={business.taxId}
          placeholder="Tax ID"
        />
        <input
          name="receiptPrefix"
          defaultValue={business.receiptPrefix}
          placeholder="Receipt prefix"
        />
        <button className="primary-button" type="submit">
          Save Business Details
        </button>
      </form>
    </Sheet>
  );
}

function SettingsRow({
  icon: Icon,
  tone,
  title,
  description,
  trailing,
  onClick,
}) {
  return (
    <button className="settings-row" type="button" onClick={onClick}>
      <span className={`settings-icon ${tone}`}>
        <Icon size={20} />
      </span>
      <span className="settings-row-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {trailing}
      <ChevronRight className="settings-chevron" size={18} />
    </button>
  );
}

function ToggleRow({name, title, description, defaultChecked}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
    </label>
  );
}

function AuthScreen({onLogin}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="auth-screen">
      <section className="auth-panel animate-in">
        <div className="brand-row">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <strong>TradeEase</strong>
        </div>

        <section className="auth-hero">
          <div className="eyebrow-row">
            <ShieldCheck size={16} />
            <span>Welcome Back</span>
          </div>
          <h1>Sign in to TradeEase</h1>
          <p>
            Premium offline-first sales, inventory, expenses, reports, and cloud
            sync for modern businesses.
          </p>
        </section>

        <form className="auth-form" onSubmit={event => event.preventDefault()}>
          <Field
            icon={Mail}
            placeholder="Email"
            defaultValue="testing18@tradeease.local"
          />
          <div className="password-field">
            <Field
              icon={Lock}
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              defaultValue="password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          <button className="primary-button" type="button" onClick={onLogin}>
            Sign in
            <ArrowRight size={18} />
          </button>
          <button className="google-button" type="button">
            <span>G</span>
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({icon: Icon, ...props}) {
  return (
    <label className="auth-field">
      <Icon size={18} />
      <input {...props} />
    </label>
  );
}

function SectionTitle({title, action, onAction}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function Transaction({icon: Icon, title, meta, amount, tone}) {
  return (
    <article className={`transaction-row ${tone || 'primary'}-border`}>
      <span className={`soft-icon ${tone}`}>
        <Icon size={20} />
      </span>
      <span className="transaction-copy">
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <b className={tone}>{amount}</b>
    </article>
  );
}

function InfoRow({label, value, strong}) {
  return (
    <div className={`info-row ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

let activeSheetLocks = 0;
let lockedScrollY = 0;
let previousPageScrollStyles = null;

function lockPageScroll() {
  if (activeSheetLocks === 0) {
    lockedScrollY = window.scrollY;
    previousPageScrollStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = '100%';
  }

  activeSheetLocks += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    activeSheetLocks = Math.max(0, activeSheetLocks - 1);

    if (activeSheetLocks === 0) {
      document.documentElement.style.overflow =
        previousPageScrollStyles?.htmlOverflow || '';
      document.body.style.position =
        previousPageScrollStyles?.bodyPosition || '';
      document.body.style.top = previousPageScrollStyles?.bodyTop || '';
      document.body.style.width = previousPageScrollStyles?.bodyWidth || '';
      document.body.style.overflow =
        previousPageScrollStyles?.bodyOverflow || '';
      window.scrollTo(0, lockedScrollY);
      previousPageScrollStyles = null;
      lockedScrollY = 0;
    }
  };
}

function Sheet({title, children, onClose, className = '', layer = 'base'}) {
  useEffect(() => {
    const unlockPageScroll = lockPageScroll();

    return unlockPageScroll;
  }, []);

  const layerClass = layer === 'raised' ? 'sheet-layer-raised' : '';

  return createPortal(
    <>
      <div
        className={`sheet-backdrop ${layerClass}`}
        onClick={onClose}
        role="presentation"
      />
      <div className={`sheet-portal ${layerClass}`}>
        <section
          className={`sheet ${className}`}
          onClick={event => event.stopPropagation()}
          role="dialog"
          aria-modal="true">
          <div className="sheet-header">
            <h2>{title}</h2>
            <button type="button" onClick={onClose}>
              <Plus size={20} />
            </button>
          </div>
          <div className="sheet-body">{children}</div>
        </section>
      </div>
    </>,
    document.body,
  );
}

createRoot(document.getElementById('root')).render(<TradeEaseApp />);
