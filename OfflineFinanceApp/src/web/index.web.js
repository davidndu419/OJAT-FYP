import React, {useMemo, useState} from 'react';
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
    date: today,
    time: '2 hours ago',
  },
  {
    id: 's2',
    productId: 'p3',
    product: 'Thermal Receipt Roll',
    quantity: 18,
    total: 11700,
    date: today,
    time: '10:18 AM',
  },
  {
    id: 's3',
    productId: 'p4',
    product: 'Barcode Scanner',
    quantity: 1,
    total: 28500,
    date: '2026-05-07',
    time: 'Yesterday',
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

const dailySalesData = [
  {day: 'May 2', sales: 6200, expenses: 1800},
  {day: 'May 3', sales: 9600, expenses: 3200},
  {day: 'May 4', sales: 4200, expenses: 1200},
  {day: 'May 5', sales: 13200, expenses: 5100},
  {day: 'May 6', sales: 11700, expenses: 16800},
  {day: 'May 7', sales: 28500, expenses: 7200},
  {day: 'May 8', sales: 17100, expenses: 4800},
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
  const [products, setProducts] = useState(initialProducts);
  const [sales, setSales] = useState(initialSales);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [userName] = useState('testing18');

  const navigate = screen => {
    const screenMap = {
      sell: 'sales',
      expense: 'expenses',
      stock: 'inventory',
    };
    setActiveScreen(screenMap[screen] || screen);
  };

  const appState = {
    products,
    sales,
    expenses,
    setProducts,
    setSales,
    setExpenses,
    userName,
    navigate,
    onLogout: () => {
      setIsAuthenticated(false);
      setActiveScreen('dashboard');
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

      <BottomNavigation activeScreen={activeScreen} onNavigate={setActiveScreen} />
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
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const stats = useMemo(() => {
    const salesToday = sales
      .filter(item => item.date === today)
      .reduce((sum, item) => sum + item.total, 0);
    const salesMonth = sales.reduce((sum, item) => sum + item.total, 0);
    const expensesMonth = expenses.reduce((sum, item) => sum + item.amount, 0);
    const lowStock = products.filter(item => item.quantity < item.threshold).length;

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
          <button className="avatar" type="button" aria-label="User profile">
            {userName.charAt(0).toUpperCase()}
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
        <QuickAction label="Sell" icon={ShoppingCart} onClick={() => navigate('sales')} />
        <QuickAction label="Expense" icon={Receipt} tone="warning" onClick={() => navigate('expenses')} />
        <QuickAction label="Stock" icon={Package} tone="blue" onClick={() => navigate('inventory')} />
      </div>

      <div className="stats-grid">
        <Metric label="Sales Today" value={formatCurrency(stats.salesToday)} icon={ArrowUpRight} tone="success" />
        <Metric label="This Month" value={formatCurrency(stats.salesMonth)} icon={TrendingUp} />
        <Metric label="Expenses" value={formatCurrency(stats.expensesMonth)} icon={TrendingDown} tone="danger" />
        <Metric label="Net Profit" value={formatCurrency(stats.netProfit)} icon={Sparkles} tone="success" />
      </div>

      <button className="low-stock-card" type="button" onClick={() => navigate('inventory')}>
        <span className="soft-icon warning">
          <AlertTriangle size={22} />
        </span>
        <span className="low-stock-copy">
          <strong>Low Stock Items</strong>
          <small>Products running low</small>
        </span>
        <b>{stats.lowStock}</b>
      </button>

      <SectionTitle title="Recent Activity" action="View All" onAction={() => navigate('reports')} />
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

  const selectedProduct = products.find(product => product.id === selectedProductId);
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
              sellingPrice: Number(data.get('sellingPrice') || product.sellingPrice),
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
        <SummaryTile label="Stock Value" value={formatCurrency(inventoryValue)} wide />
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
        <Sheet title="Add Product" onClose={() => setModalOpen(false)}>
          <form className="sheet-form" onSubmit={addProduct}>
            <input name="name" placeholder="Product name" required />
            <input name="sku" placeholder="SKU" />
            <input name="category" placeholder="Category" />
            <div className="form-row">
              <input name="costPrice" inputMode="decimal" placeholder="Cost price" />
              <input name="sellingPrice" inputMode="decimal" placeholder="Selling price" />
            </div>
            <div className="form-row">
              <input name="quantity" inputMode="numeric" placeholder="Quantity" />
              <input name="threshold" inputMode="numeric" placeholder="Low stock at" />
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
  const progress = Math.min(100, Math.round((product.quantity / Math.max(product.threshold * 3, 1)) * 100));
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
          <p>{product.sku} / {product.category}</p>
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
          <strong className={margin >= 0 ? 'success' : 'danger'}>{formatCurrency(margin)}</strong>
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
        <span className={`soft-icon ${product.quantity < product.threshold ? 'danger' : 'primary'}`}>
          <Package size={22} />
        </span>
        <div>
          <h3>{product.name}</h3>
          <p>{product.sku} / {product.category}</p>
        </div>
      </div>

      <div className="detail-stats">
        <SummaryTile label="Quantity" value={product.quantity} />
        <SummaryTile label="Sold Units" value={soldUnits} />
        <SummaryTile label="Revenue" value={formatCurrency(revenue)} wide />
      </div>

      {isEditing ? (
        <form className="sheet-form" onSubmit={onSave}>
          <input name="name" defaultValue={product.name} placeholder="Product name" required />
          <input name="sku" defaultValue={product.sku} placeholder="SKU" />
          <input name="category" defaultValue={product.category} placeholder="Category" />
          <div className="form-row">
            <input name="costPrice" defaultValue={product.costPrice} inputMode="decimal" placeholder="Cost price" />
            <input name="sellingPrice" defaultValue={product.sellingPrice} inputMode="decimal" placeholder="Selling price" />
          </div>
          <div className="form-row">
            <input name="quantity" defaultValue={product.quantity} inputMode="numeric" placeholder="Quantity" />
            <input name="threshold" defaultValue={product.threshold} inputMode="numeric" placeholder="Low stock at" />
          </div>
          <div className="detail-actions">
            <button className="secondary-button" type="button" onClick={onCancelEdit}>
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
              <strong className={margin >= 0 ? 'success' : 'danger'}>{formatCurrency(margin)}</strong>
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
              <p className="empty-copy">No transactions recorded for this product yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Sales({products, setProducts, sales, setSales}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const selectedProduct = products.find(item => item.id === selectedId);
  const filteredProducts = products.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  const total = Number(quantity || 0) * Number(selectedProduct?.sellingPrice || 0);

  const recordSale = () => {
    if (!selectedProduct || quantity < 1 || quantity > selectedProduct.quantity) {
      return;
    }

    setSales(current => [
      {
        id: `s${Date.now()}`,
        productId: selectedProduct.id,
        product: selectedProduct.name,
        quantity,
        total,
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
  };

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Sales" title="Record Sale" />

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
                <small>Qty {product.quantity} / {formatCurrency(product.sellingPrice)}</small>
              </span>
              {selectedId === product.id && <CheckCircle2 size={18} />}
            </button>
          ))}
        </div>

        {selectedProduct && (
          <div className="selected-product">
            <strong>{selectedProduct.name}</strong>
            <span>
              Available {selectedProduct.quantity} / Selling price {formatCurrency(selectedProduct.sellingPrice)}
            </span>
          </div>
        )}

        <div className="quantity-stepper">
          <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))}>
            <Minus size={18} />
          </button>
          <input
            value={quantity}
            inputMode="numeric"
            onChange={event => setQuantity(Math.max(1, Number(event.target.value || 1)))}
          />
          <button type="button" onClick={() => setQuantity(value => value + 1)}>
            <Plus size={18} />
          </button>
        </div>

        {selectedProduct && quantity > selectedProduct.quantity && (
          <p className="warning-text">Only {selectedProduct.quantity} item(s) available.</p>
        )}

        <div className="total-box">
          <span>Calculated Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <button className="primary-button" type="button" onClick={recordSale}>
          Confirm Sale
        </button>
      </article>

      <SectionTitle title="Today's Sales" />
      <div className="activity-list">
        {sales
          .filter(item => item.date === today)
          .map(item => (
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
        <input name="amount" inputMode="decimal" placeholder="Amount" required />
        <div className="date-control">
          <button type="button" onClick={() => setDate('2026-05-07')} aria-label="Previous day">
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

function Reports({sales, expenses}) {
  const revenue = sales.reduce((sum, item) => sum + item.total, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = revenue - totalExpenses;
  const [range, setRange] = useState('month');
  const [activePieCategory, setActivePieCategory] = useState(null);

  const expenseBreakdown = expenseCategories
    .map((category, index) => ({
      category,
      total: expenses
        .filter(item => item.category === category)
        .reduce((sum, item) => sum + item.amount, 0),
      color: ['#1f3a5f', '#12a66a', '#e6a122', '#2563eb', '#7c3aed', '#dc3f2f'][index],
    }))
    .filter(item => item.total > 0);

  const bestSellingProduct =
    sales.reduce((best, item) => (item.quantity > (best?.quantity || 0) ? item : best), null)
      ?.product || 'None';

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Reports" title="Insights" />

      <article className="form-card report-filter">
        <div className="range-tabs">
          {[
            ['week', '7D'],
            ['month', 'MTD'],
            ['quarter', 'QTR'],
          ].map(([key, label]) => (
            <button
              className={range === key ? 'active' : ''}
              key={key}
              onClick={() => setRange(key)}
              type="button">
              {label}
            </button>
          ))}
        </div>
        <div className="form-row">
          <label>
            <Calendar size={16} />
            <input value="2026-05-01" readOnly />
          </label>
          <label>
            <Calendar size={16} />
            <input value="2026-05-08" readOnly />
          </label>
        </div>
      </article>

      <section className="profit-card">
        <div className="eyebrow-row">
          <TrendingUp size={18} />
          <span>Net Profit</span>
        </div>
        <strong>{formatCurrency(netProfit)}</strong>
        <div className="profit-split">
          <span>Revenue {formatCurrency(revenue)}</span>
          <span>Expenses {formatCurrency(totalExpenses)}</span>
        </div>
      </section>

      <article className="chart-card">
        <div className="chart-heading">
          <h2>Daily Sales</h2>
          <span>{range.toUpperCase()}</span>
        </div>
        <div className="rechart-box">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dailySalesData} barGap={6}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="day" tick={{fontSize: 10, fill: '#667085'}} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{fill: 'rgba(31,58,95,0.06)'}}
                formatter={value => formatCurrency(value)}
              />
              <Bar dataKey="sales" fill="#1f3a5f" radius={[8, 8, 2, 2]} />
              <Bar dataKey="expenses" fill="#e6a122" radius={[8, 8, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card">
        <div className="chart-heading">
          <h2>Expenses Breakdown</h2>
          <span>{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="breakdown-layout">
          <ResponsiveContainer width="38%" height={132}>
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Pie
                data={expenseBreakdown}
                dataKey="total"
                nameKey="category"
                innerRadius={34}
                outerRadius={60}
                paddingAngle={3}
                onMouseEnter={entry => setActivePieCategory(entry.category)}
                onMouseLeave={() => setActivePieCategory(null)}
                onClick={entry => setActivePieCategory(entry.category)}>
                {expenseBreakdown.map(item => (
                  <Cell
                    className="pie-slice"
                    key={item.category}
                    fill={item.color}
                    opacity={!activePieCategory || activePieCategory === item.category ? 1 : 0.35}
                    stroke={activePieCategory === item.category ? '#111827' : '#ffffff'}
                    strokeWidth={activePieCategory === item.category ? 2 : 1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="breakdown-list">
            {expenseBreakdown.map(item => (
              <div
                className={`breakdown-row ${activePieCategory === item.category ? 'active' : ''}`}
                key={item.category}
                onMouseEnter={() => setActivePieCategory(item.category)}
                onMouseLeave={() => setActivePieCategory(null)}>
                <span>
                  <i style={{backgroundColor: item.color}} />
                  {item.category}
                </span>
                <strong>{formatCurrency(item.total)}</strong>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="pnl-card">
        <InfoRow label="Total revenue" value={formatCurrency(revenue)} />
        <InfoRow label="Total expenses" value={formatCurrency(totalExpenses)} />
        <InfoRow label="Net profit" value={formatCurrency(netProfit)} strong />
        <InfoRow label="Best selling product" value={bestSellingProduct} />
        <InfoRow label="Most expensive category" value={expenseBreakdown[0]?.category || 'None'} />
      </article>
    </section>
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

function SettingsScreen({products, sales, expenses, onLogout}) {
  const pendingCounts = {
    products: products.filter(item => item.quantity < item.threshold).length,
    sales: sales.length,
    expenses: expenses.length,
  };
  const totalPending = pendingCounts.products + pendingCounts.sales + pendingCounts.expenses;

  return (
    <section className="screen animate-in">
      <ScreenHeader eyebrow="Settings" title="Settings" />

      <SettingsGroup title="Account">
        <SettingsRow
          icon={User}
          tone="user"
          title="Personal Info"
          description="Profile, email, and contact details"
        />
        <SettingsRow
          icon={Building2}
          tone="business"
          title="Business Details"
          description="Company, tax, and receipt information"
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
              Synced
            </span>
          }
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
              <strong>May 8, 2026, 5:51 PM</strong>
            </div>
          </div>
          <button className="primary-button sync-button" type="button">
            <RefreshCw size={18} />
            Manual Sync
          </button>
        </article>

        <SettingsRow
          icon={ShieldCheck}
          tone="security"
          title="Security"
          description="Password, PIN, and device protection"
        />
      </SettingsGroup>

      <button className="logout-button" type="button" onClick={onLogout}>
        <LogOut size={18} />
        Logout
      </button>

      <footer className="settings-version">TradeEase v1.0.0</footer>
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

function SettingsRow({icon: Icon, tone, title, description, trailing}) {
  return (
    <button className="settings-row" type="button">
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
          <p>Premium offline-first sales, inventory, expenses, reports, and cloud sync for modern businesses.</p>
        </section>

        <form className="auth-form" onSubmit={event => event.preventDefault()}>
          <Field icon={Mail} placeholder="Email" defaultValue="testing18@tradeease.local" />
          <div className="password-field">
            <Field
              icon={Lock}
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              defaultValue="password"
            />
            <button type="button" onClick={() => setShowPassword(value => !value)}>
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
    <article className="transaction-row">
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
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
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
        {children}
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<TradeEaseApp />);
