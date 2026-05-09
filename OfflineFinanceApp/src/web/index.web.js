import React, {useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudCog as CloudRefresh,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mail,
  Minus,
  Package,
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
const today = '2026-05-08';

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
    date: '2026-05-07',
    time: 'Yesterday',
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
    date: '2026-05-07',
  },
  {
    id: 'e3',
    category: 'Stock Purchase',
    description: 'Receipt roll restock',
    amount: 16800,
    date: '2026-05-06',
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

function TradeEaseApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [activeModal, setActiveModal] = useState('');
  const [products, setProducts] = useState(initialProducts);
  const [sales, setSales] = useState(initialSales);
  const [services, setServices] = useState(initialServices);
  const [serviceTypes, setServiceTypes] = useState(initialServiceTypes);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [balanceDisplay, setBalanceDisplay] = useState('separate');
  const [expenseAllocation, setExpenseAllocation] = useState('combined');
  const [salesExpensePercent, setSalesExpensePercent] = useState(60);
  const [servicesExpensePercent, setServicesExpensePercent] = useState(40);
  const [userName] = useState('testing18');
  const [business, setBusiness] = useState({
    name: 'TradeEase Store',
    taxId: 'TIN-2480-TE',
    receiptPrefix: 'TE',
  });

  const navigate = screen => {
    if (screen === 'business-details') {
      setActiveModal('business-details');
      return;
    }

    const screenMap = {
      sell: 'sales',
      expense: 'expenses',
      stock: 'inventory',
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
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-panel">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeScreen === item.key;

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

function Dashboard({products, sales, expenses, userName, navigate}) {
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
    const salesToday = sales
      .filter(item => item.date === today)
      .reduce((sum, item) => sum + item.total, 0);
    const salesMonth = sales.reduce((sum, item) => sum + item.total, 0);
    const expensesMonth = expenses.reduce((sum, item) => sum + item.amount, 0);
    const lowStock = products.filter(
      item => item.quantity < item.threshold,
    ).length;

    return {
      salesToday,
      salesMonth,
      expensesMonth,
      netProfit: salesMonth - expensesMonth,
      lowStock,
    };
  }, [expenses, products, sales]);

  return (
    <section className="screen animate-in">
      <ScreenHeader
        eyebrow={`${greeting}, ${userName}`}
        title="Dashboard"
        action={
          <button
            className="avatar"
            type="button"
            aria-label="Open business details"
            onClick={() => navigate('business-details')}>
            <Building2 size={21} strokeWidth={2.4} />
            <span />
          </button>
        }
      />

      <section className="balance-card">
        <div className="balance-orb orb-one" />
        <div className="balance-orb orb-two" />
        <div className="balance-content">
          <div className="eyebrow-row">
            <Sparkles size={16} />
            <span>Total Balance</span>
          </div>
          <strong>{formatCurrency(stats.netProfit)}</strong>
          <p>Sales minus expenses this month</p>
          <div className="growth-chip">
            <TrendingUp size={14} /> +12.5% vs last month
          </div>
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

      <div className="stats-grid">
        <Metric
          label="Sales Today"
          value={formatCurrency(stats.salesToday)}
          icon={ArrowUpRight}
          tone="success"
        />
        <Metric
          label="This Month"
          value={formatCurrency(stats.salesMonth)}
          icon={TrendingUp}
        />
        <Metric
          label="Expenses"
          value={formatCurrency(stats.expensesMonth)}
          icon={TrendingDown}
          tone="danger"
        />
        <Metric
          label="Net Profit"
          value={formatCurrency(stats.netProfit)}
          icon={Sparkles}
          tone="success"
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
        {sales.slice(0, 3).map(item => (
          <Transaction
            key={item.id}
            icon={ShoppingCart}
            title={item.product}
            meta={`Qty ${item.quantity} / ${item.time}`}
            amount={`+${formatCurrency(item.total)}`}
            tone="success"
          />
        ))}
      </div>
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

function Metric({label, value, icon: Icon, tone = 'default'}) {
  return (
    <article className="metric-card">
      <div className="metric-head">
        <span>{label}</span>
        <Icon className={`metric-icon ${tone}`} size={17} />
      </div>
      <strong className={tone}>{value}</strong>
    </article>
  );
}

function Inventory({products, setProducts, sales}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  const counts = useMemo(() => {
    const low = products.filter(item => item.quantity < item.threshold).length;
    return {all: products.length, low, ok: products.length - low};
  }, [products]);

  const inventoryValue = products.reduce(
    (sum, item) => sum + item.quantity * item.sellingPrice,
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
    ? sales.filter(item => item.productId === selectedProduct.id)
    : [];

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
      updatedAt: 'Just now',
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
              updatedAt: 'Just now',
            }
          : product,
      ),
    );
    setIsEditingProduct(false);
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
          className="add-product-sheet">
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

      {selectedProduct && (
        <Sheet
          title={selectedProduct.name}
          onClose={() => {
            setSelectedProductId('');
            setIsEditingProduct(false);
          }}
          className="product-detail-sheet">
          <ProductDetail
            product={selectedProduct}
            transactions={selectedProductSales}
            isEditing={isEditingProduct}
            onEdit={() => setIsEditingProduct(true)}
            onCancelEdit={() => setIsEditingProduct(false)}
            onSave={updateProduct}
          />
        </Sheet>
      )}
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
  const margin = product.sellingPrice - product.costPrice;

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
}) {
  const margin = product.sellingPrice - product.costPrice;
  const soldUnits = transactions.reduce((sum, item) => sum + item.quantity, 0);
  const revenue = transactions.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="product-detail">
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
              defaultValue={product.costPrice}
              inputMode="decimal"
              placeholder="Cost price"
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
              <span>Cost Price</span>
              <strong>{formatCurrency(product.costPrice)}</strong>
            </div>
            <div>
              <span>Margin</span>
              <strong className={margin >= 0 ? 'success' : 'danger'}>
                {formatCurrency(margin)}
              </strong>
            </div>
          </div>

          <button className="primary-button" type="button" onClick={onEdit}>
            Edit Product
          </button>

          <div className="detail-section-title">
            <h3>Product Transactions</h3>
            <span>{transactions.length}</span>
          </div>
          <div className="detail-transactions">
            {transactions.length > 0 ? (
              transactions.map(item => (
                <Transaction
                  key={item.id}
                  icon={ShoppingCart}
                  title={item.product}
                  meta={`Qty ${item.quantity} / ${item.time}`}
                  amount={`+${formatCurrency(item.total)}`}
                  tone="success"
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
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [serviceAmount, setServiceAmount] = useState('');
  const [servicePaymentMethod, setServicePaymentMethod] = useState('cash');
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes[0]?.id || '');
  const [serviceNotes, setServiceNotes] = useState('');
  const [activeForm, setActiveForm] = useState('');
  const [balanceView, setBalanceView] = useState(
    balanceDisplay === 'combined'
      ? 'both'
      : balanceDisplay === 'services_only'
      ? 'services'
      : 'sales',
  );
  const [transactionView, setTransactionView] = useState('both');
  const selectedProduct = products.find(item => item.id === selectedId);
  const selectedServiceType = serviceTypes.find(
    item => item.id === serviceTypeId,
  );
  const filteredProducts = products.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  const total =
    Number(quantity || 0) * Number(selectedProduct?.sellingPrice || 0);
  const todaySales = sales.filter(item => item.date === today);
  const todayServices = services.filter(item => item.date === today);
  const balance = useMemo(
    () => ({
      salesCash: todaySales
        .filter(item => (item.paymentMethod || 'cash') === 'cash')
        .reduce((sum, item) => sum + item.total, 0),
      salesBank: todaySales
        .filter(item => item.paymentMethod === 'bank')
        .reduce((sum, item) => sum + item.total, 0),
      servicesCash: todayServices
        .filter(item => (item.paymentMethod || 'cash') === 'cash')
        .reduce((sum, item) => sum + item.amount, 0),
      servicesBank: todayServices
        .filter(item => item.paymentMethod === 'bank')
        .reduce((sum, item) => sum + item.amount, 0),
    }),
    [todaySales, todayServices],
  );
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
    ...todaySales.map(item => ({...item, type: 'sale'})),
    ...todayServices.map(item => ({...item, type: 'service'})),
  ].filter(item => {
    if (transactionView === 'sales') {
      return item.type === 'sale';
    }
    if (transactionView === 'services') {
      return item.type === 'service';
    }
    return true;
  });

  const recordSale = () => {
    if (
      !selectedProduct ||
      quantity < 1 ||
      quantity > selectedProduct.quantity
    ) {
      return;
    }

    setSales(current => [
      {
        id: `s${Date.now()}`,
        productId: selectedProduct.id,
        product: selectedProduct.name,
        quantity,
        total,
        paymentMethod,
        date: today,
        time: 'Just now',
      },
      ...current,
    ]);
    setProducts(current =>
      current.map(item =>
        item.id === selectedProduct.id
          ? {...item, quantity: item.quantity - quantity, updatedAt: 'Just now'}
          : item,
      ),
    );
    setQuantity(1);
    setPaymentMethod('cash');
    setActiveForm('');
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
        time: 'Just now',
        notes: serviceNotes,
      },
      ...current,
    ]);
    setServiceAmount('');
    setServicePaymentMethod('cash');
    setServiceNotes('');
    setActiveForm('');
  };

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Sales" title="Sales and Services" />

      <article className="sales-balance-card">
        <div className="sales-balance-head">
          <div>
            <span>Today&apos;s Balance</span>
            <strong>
              {formatCurrency(
                balance.salesCash +
                  balance.salesBank +
                  balance.servicesCash +
                  balance.servicesBank,
              )}
            </strong>
          </div>
          <Sparkles size={20} />
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
          title="Record Product Sale"
          onClose={() => setActiveForm('')}
          className="sales-sheet">
          <article className="form-card sale-card">
            <label className="field-label">Product</label>
            <label className="search-field compact-search">
              <Search size={18} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search and select product"
              />
            </label>

            <div className="product-options">
              {filteredProducts.slice(0, 3).map(product => (
                <button
                  className={selectedId === product.id ? 'active' : ''}
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  type="button">
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      Qty {product.quantity} /{' '}
                      {formatCurrency(product.sellingPrice)}
                    </small>
                  </span>
                  {selectedId === product.id && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>

            {selectedProduct && (
              <div className="selected-product">
                <strong>{selectedProduct.name}</strong>
                <span>
                  Available {selectedProduct.quantity} / Selling price{' '}
                  {formatCurrency(selectedProduct.sellingPrice)}
                </span>
              </div>
            )}

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

            <button
              className="primary-button"
              type="button"
              onClick={recordSale}>
              Confirm Sale
            </button>
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

      <SectionTitle title="Today's Transactions" />
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
          <p className="empty-copy">
            No transactions recorded for this view today.
          </p>
        )}
      </div>
    </section>
  );
}

function Expenses({expenses, setExpenses}) {
  const [category, setCategory] = useState('Transport');
  const [date, setDate] = useState(today);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const monthlyTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

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
      },
      ...current,
    ]);
    event.currentTarget.reset();
  };

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Expenses" title="Spend" />

      <section className="expense-hero">
        <span>Total Expenses This Month</span>
        <strong>{formatCurrency(monthlyTotal)}</strong>
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
            onClick={() => setDate('2026-05-07')}
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
        {expenses.map(item => (
          <Transaction
            key={item.id}
            icon={Receipt}
            title={item.category}
            meta={`${item.description} / ${item.date}`}
            amount={`-${formatCurrency(item.amount)}`}
            tone="danger"
          />
        ))}
      </div>
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
}) {
  const [activeTab, setActiveTab] = useState('sales');
  const [fromDate, setFromDate] = useState('2026-05-01');
  const [toDate, setToDate] = useState(today);
  const inRange = item => item.date >= fromDate && item.date <= toDate;
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
    return sum + Number(product?.costPrice || 0) * Number(sale.quantity || 0);
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

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Reports" title="Insights" />

      <article className="form-card report-filter">
        <div className="form-row">
          <label>
            <Calendar size={16} />
            <input
              value={fromDate}
              onChange={event => setFromDate(event.target.value)}
            />
          </label>
          <label>
            <Calendar size={16} />
            <input
              value={toDate}
              onChange={event => setToDate(event.target.value)}
            />
          </label>
        </div>
      </article>

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
          <ReportHero label="Net Sales Profit" value={netSalesProfit} />
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
          <ReportHero label="Net Service Profit" value={netServiceProfit} />
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
          <ReportHero label="Net Business Profit" value={netBusinessProfit} />
          <article className="chart-card">
            <div className="chart-heading">
              <h2>Profit Trend</h2>
              <span>
                {fromDate} - {toDate}
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

function ReportHero({label, value}) {
  return (
    <section className="profit-card">
      <div className="eyebrow-row">
        <TrendingUp size={18} />
        <span>{label}</span>
      </div>
      <strong>{formatCurrency(value)}</strong>
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

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Settings" title="Settings" />

      <SettingsGroup title="Service Types Management">
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
      </SettingsGroup>

      <SettingsGroup title="Balance Card Display">
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
      </SettingsGroup>

      <SettingsGroup title="Profit Calculation Method">
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
                  onChange={event => updateServicesPercent(event.target.value)}
                  inputMode="numeric"
                />
              </label>
            </div>
          )}
          {allocationError ? (
            <p className="settings-error">{allocationError}</p>
          ) : null}
        </div>
      </SettingsGroup>

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

function Sheet({title, children, onClose, className = ''}) {
  useEffect(() => {
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.width = previousBodyStyles.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} role="presentation" />
      <div className="sheet-portal">
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
