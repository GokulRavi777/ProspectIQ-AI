import React, { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import scoredLeadsData from '../data/scored_leads.json';
import metricsData from '../data/metrics.json';
import { 
  Search, LogOut, ChevronDown, ChevronUp, Plus, X, 
  Users, Flame, FileText, TrendingUp, Bell, Filter, 
  ChevronLeft, ChevronRight, Lock, Download, LayoutDashboard, 
  Database, Activity, GitBranch, FileSpreadsheet, Settings, 
  CircleUser, CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';

type Lead = {
  customer_id: string;
  name: string;
  persona_label: string;
  repayment_capacity_score: number;
  conversion_propensity_score: number;
  tier: "Hot" | "Warm" | "Cold";
  thin_file: boolean;
  recommended_product: "Personal Loan" | "Home Loan" | "Mortgage Loan" | "Auto Loan";
  eligible_loan_amount: number;
  top_factors: Array<{ factor: string; impact: "positive" | "negative" }>;
  explanation_text: string;
};

type Metrics = {
  baseline_conversion_rate: number;
  prospectiq_conversion_rate: number;
  conversion_lift_multiple: number;
  total_leads_scored: number;
  hot_leads_count: number;
  warm_leads_count: number;
  cold_leads_count: number;
  thin_file_customers_scored: number;
  thin_file_coverage_pct: number;
  avg_repayment_capacity_score: number;
  model_precision: number;
  model_recall: number;
  model_f1: number;
};

const PIE_COLORS = ['#F97316', '#EAB308', '#64748B']; // Orange (Hot), Yellow (Warm), Gray (Cold)

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Table state
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: 'asc' | 'desc' } | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Row selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Simulate Modal state
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simForm, setSimForm] = useState({
    monthly_income: 50000,
    income_type: 'Salaried',
    existing_emi: 10000,
    recent_calculator_visits: 2
  });
  const [simLoading, setSimLoading] = useState(false);
  const [simulatedLead, setSimulatedLead] = useState<Lead | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Hackathon Bypass: Load data directly from JSON to avoid Vercel backend issues
    try {
      setLeads(scoredLeadsData as Lead[]);
      setMetrics(metricsData as Metrics);
    } catch (e) {
      console.error("Error loading JSON data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const handleSort = (key: keyof Lead) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const toggleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelect = () => {
    if (selectedRows.size === currentLeads.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(currentLeads.map(l => l.customer_id)));
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimulatedLead(null);
    try {
      // Mock simulate for hackathon demo
      setTimeout(() => {
        setSimulatedLead({
          customer_id: "SIM-" + Math.floor(Math.random() * 10000),
          name: "Simulated Demo User",
          persona_label: "Simulated Profile",
          repayment_capacity_score: Math.random() * 40 + 60,
          conversion_propensity_score: Math.random() * 40 + 60,
          tier: "Warm",
          thin_file: false,
          recommended_product: "Personal Loan",
          eligible_loan_amount: Number(simForm.monthly_income) * 10,
          top_factors: [
            { factor: "Income to EMI ratio", impact: "positive" },
            { factor: "Recent engagement", impact: "positive" }
          ],
          explanation_text: "This is a mocked simulation bypassing the backend for the live demo."
        } as Lead);
        setSimLoading(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setSimLoading(false);
    }
  };

  // ----------------------------------------
  // Data processing for charts and tables
  // ----------------------------------------
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchSearch = lead.customer_id.toLowerCase().includes(search.toLowerCase()) || 
                          lead.name.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === 'All' || lead.tier === tierFilter;
      const matchStatus = statusFilter === 'All' || 
                          (statusFilter === 'Thin File' && lead.thin_file) || 
                          (statusFilter === 'Standard' && !lead.thin_file);
      const matchProduct = productFilter === 'All' || lead.recommended_product === productFilter;
      
      return matchSearch && matchTier && matchStatus && matchProduct;
    });
  }, [leads, search, tierFilter, statusFilter, productFilter]);

  const sortedLeads = useMemo(() => {
    let sortable = [...filteredLeads];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortable;
  }, [filteredLeads, sortConfig]);

  // Pagination bounds
  const totalPages = Math.ceil(sortedLeads.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentLeads = sortedLeads.slice(startIndex, startIndex + pageSize);

  // Compute Chart Data directly from the leads dataset
  const scoreDistData = useMemo(() => {
    const bins = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    leads.forEach(l => {
      const s = l.repayment_capacity_score;
      if (s <= 20) bins['0-20']++;
      else if (s <= 40) bins['21-40']++;
      else if (s <= 60) bins['41-60']++;
      else if (s <= 80) bins['61-80']++;
      else bins['81-100']++;
    });
    return Object.keys(bins).map(name => ({ name, count: bins[name as keyof typeof bins] }));
  }, [leads]);

  const tierDistData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Hot', value: metrics.hot_leads_count },
      { name: 'Warm', value: metrics.warm_leads_count },
      { name: 'Cold', value: metrics.cold_leads_count },
    ];
  }, [metrics]);

  // Mock historical trend data
  const trendData = [
    { day: 'Mon', leads: 120 }, { day: 'Tue', leads: 145 }, { day: 'Wed', leads: 132 },
    { day: 'Thu', leads: 178 }, { day: 'Fri', leads: 190 }, { day: 'Sat', leads: 85 }, { day: 'Sun', leads: 150 }
  ];

  if (loading) {
    return <div className="min-h-screen bg-[#0B2447] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-[#0B2447] font-sans overflow-hidden">
      
      {/* 1. Left Sidebar Shell */}
      <aside className="w-64 bg-[#071A36] border-r border-[#2A4B8D] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#2A4B8D]">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mr-3 shadow-inner">
            <Activity size={20} className="text-white" />
          </div>
          <span className="text-white font-bold tracking-tight text-lg">ProspectIQ</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-[#B8C0CC] uppercase tracking-wider mb-3 px-2">Main Menu</div>
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#2A4B8D]/30 border-l-2 border-blue-500 text-white transition-colors">
            <LayoutDashboard size={18} />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#B8C0CC] hover:bg-[#2A4B8D]/10 hover:text-white transition-colors text-left">
            <Database size={18} />
            <span className="text-sm font-medium">Leads Pipeline</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#B8C0CC] hover:bg-[#2A4B8D]/10 hover:text-white transition-colors text-left">
            <GitBranch size={18} />
            <span className="text-sm font-medium">Risk Models</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#B8C0CC] hover:bg-[#2A4B8D]/10 hover:text-white transition-colors text-left">
            <FileSpreadsheet size={18} />
            <span className="text-sm font-medium">Reports</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-[#B8C0CC] hover:bg-[#2A4B8D]/10 hover:text-white transition-colors text-left mt-6">
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-[#2A4B8D] flex items-center space-x-3">
          <CircleUser size={36} className="text-gray-400" />
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium text-white truncate">Credit Analyst User</div>
            <div className="text-xs text-[#B8C0CC] truncate">Risk Dept</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Bar */}
        <header className="h-16 bg-[#0B2447] border-b border-[#2A4B8D] flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center space-x-2 text-[#B8C0CC] text-sm font-medium">
            <span>Overview</span>
            <span className="text-gray-500">/</span>
            <span className="text-white">Dashboard</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-[#B8C0CC] bg-[#19376D] px-3 py-1.5 rounded-md border border-[#2A4B8D]">
              Last 30 days ▾
            </div>
            <button className="text-[#B8C0CC] hover:text-white transition-colors">
              <Bell size={20} />
            </button>
            <div className="w-px h-6 bg-[#2A4B8D] mx-2"></div>
            <button 
              onClick={() => setIsSimulateOpen(true)}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus size={16} />
              <span>Simulate Lead</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center space-x-2 border border-[#2A4B8D] text-[#B8C0CC] px-3 py-1.5 rounded-md hover:bg-[#2A4B8D]/30 hover:text-white transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          <div className="max-w-[1400px] mx-auto space-y-8">
            
            {/* 2. KPI Stats Row */}
            {metrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-[#19376D] p-5 rounded-xl border border-[#2A4B8D] shadow-sm flex flex-col justify-between relative">
                  <div className="text-[11px] text-[#B8C0CC] uppercase tracking-wider font-semibold mb-1">Total Leads Scored</div>
                  <div className="text-3xl font-bold text-white tabular-nums">{metrics.total_leads_scored.toLocaleString()}</div>
                  <div className="mt-2 text-xs font-medium text-green-400 flex items-center">+12.4% vs last period</div>
                  <Users size={20} className="absolute top-5 right-5 text-gray-500 opacity-50" />
                </div>
                
                <div className="bg-[#19376D] p-5 rounded-xl border border-[#2A4B8D] shadow-sm flex flex-col justify-between relative">
                  <div className="text-[11px] text-[#B8C0CC] uppercase tracking-wider font-semibold mb-1">Hot Leads</div>
                  <div className="text-3xl font-bold text-orange-400 tabular-nums">{metrics.hot_leads_count.toLocaleString()}</div>
                  <div className="mt-2 text-xs font-medium text-green-400 flex items-center">+5.2% vs last period</div>
                  <Flame size={20} className="absolute top-5 right-5 text-gray-500 opacity-50" />
                </div>
                
                <div className="bg-[#19376D] p-5 rounded-xl border border-[#2A4B8D] shadow-sm flex flex-col justify-between relative">
                  <div className="text-[11px] text-[#B8C0CC] uppercase tracking-wider font-semibold mb-1">Thin File Coverage</div>
                  <div className="text-3xl font-bold text-blue-400 tabular-nums">{(metrics.thin_file_coverage_pct * 100).toFixed(1)}%</div>
                  <div className="mt-2 text-xs font-medium text-red-400 flex items-center">-1.1% vs last period</div>
                  <FileText size={20} className="absolute top-5 right-5 text-gray-500 opacity-50" />
                </div>
                
                <div className="bg-[#19376D] p-5 rounded-xl border border-[#2A4B8D] shadow-sm flex flex-col justify-between relative">
                  <div className="text-[11px] text-[#B8C0CC] uppercase tracking-wider font-semibold mb-1">Conversion Lift</div>
                  <div className="text-3xl font-bold text-green-400 tabular-nums">{metrics.conversion_lift_multiple}x</div>
                  <div className="mt-2 text-xs font-medium text-green-400 flex items-center">+0.1x vs last period</div>
                  <TrendingUp size={20} className="absolute top-5 right-5 text-gray-500 opacity-50" />
                </div>
              </div>
            )}

            {/* 3. Data Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Distribution */}
              <div className="bg-[#19376D] rounded-xl border border-[#2A4B8D] p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-4">Lead Score Distribution</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A4B8D" vertical={false} />
                      <XAxis dataKey="name" stroke="#B8C0CC" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#B8C0CC" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#2A4B8D', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0B2447', borderColor: '#2A4B8D', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Tier Breakdown */}
              <div className="bg-[#19376D] rounded-xl border border-[#2A4B8D] p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-4">Tier Breakdown</h3>
                <div className="h-48 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tierDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {tierDistData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0B2447', borderColor: '#2A4B8D', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend inside absolute div for tighter layout */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-2">
                    {tierDistData.map((_entry, index) => (
                      <div key={_entry.name} className="flex items-center text-xs text-[#B8C0CC]">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: PIE_COLORS[index] }}></div>
                        {_entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trend */}
              <div className="bg-[#19376D] rounded-xl border border-[#2A4B8D] p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-4">Leads Over Time (Mock)</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A4B8D" vertical={false} />
                      <XAxis dataKey="day" stroke="#B8C0CC" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#B8C0CC" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0B2447', borderColor: '#2A4B8D', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="leads" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4. Leads Table & Filters */}
            <div className="bg-[#19376D] rounded-xl border border-[#2A4B8D] shadow-sm flex flex-col">
              
              {/* Filter Bar */}
              <div className="p-4 border-b border-[#2A4B8D] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search ID/Name..."
                      className="w-full sm:w-64 pl-9 pr-4 py-1.5 bg-[#0B2447] border border-[#2A4B8D] rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter size={16} className="text-[#B8C0CC]" />
                    <select 
                      value={tierFilter} 
                      onChange={e => { setTierFilter(e.target.value); setCurrentPage(1); }}
                      className="bg-[#0B2447] border border-[#2A4B8D] text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 appearance-none pr-8"
                    >
                      <option value="All">All Tiers</option>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                    
                    <select 
                      value={statusFilter} 
                      onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                      className="bg-[#0B2447] border border-[#2A4B8D] text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 appearance-none pr-8 hidden md:block"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Thin File">Thin File</option>
                      <option value="Standard">Standard</option>
                    </select>

                    <select 
                      value={productFilter} 
                      onChange={e => { setProductFilter(e.target.value); setCurrentPage(1); }}
                      className="bg-[#0B2447] border border-[#2A4B8D] text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 appearance-none pr-8 hidden lg:block"
                    >
                      <option value="All">All Products</option>
                      <option value="Personal Loan">Personal Loan</option>
                      <option value="Home Loan">Home Loan</option>
                      <option value="Mortgage Loan">Mortgage Loan</option>
                      <option value="Auto Loan">Auto Loan</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedRows.size > 0 && (
                    <div className="flex items-center gap-2 mr-2 animate-in fade-in">
                      <span className="text-xs text-[#B8C0CC]">{selectedRows.size} selected</span>
                      <button className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 hover:bg-blue-600/30">Action ▾</button>
                    </div>
                  )}
                  <button className="flex items-center justify-center space-x-1.5 border border-[#2A4B8D] text-[#B8C0CC] px-3 py-1.5 rounded-md hover:bg-[#2A4B8D]/30 hover:text-white transition-colors text-sm">
                    <Download size={14} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
              
              {/* Data Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#0B2447]/80 text-[#B8C0CC] border-b border-[#2A4B8D]">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#2A4B8D] bg-[#0B2447] text-blue-600 focus:ring-blue-500 focus:ring-offset-[#19376D]"
                          checked={currentLeads.length > 0 && selectedRows.size === currentLeads.length}
                          onChange={toggleAllSelect}
                        />
                      </th>
                      <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider cursor-pointer select-none group" onClick={() => handleSort('customer_id')}>
                        <div className="flex items-center">ID / Name {sortConfig?.key === 'customer_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                      </th>
                      <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('tier')}>
                        <div className="flex items-center">Tier {sortConfig?.key === 'tier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                      </th>
                      <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider cursor-pointer select-none text-right" onClick={() => handleSort('repayment_capacity_score')}>
                        <div className="flex items-center justify-end">RCS Score {sortConfig?.key === 'repayment_capacity_score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                      </th>
                      <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider cursor-pointer select-none text-right" onClick={() => handleSort('conversion_propensity_score')}>
                        <div className="flex items-center justify-end">CPS Score {sortConfig?.key === 'conversion_propensity_score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                      </th>
                      <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider text-right">Product / Amount</th>
                      <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A4B8D]/50">
                    {currentLeads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-[#B8C0CC]">
                          No leads found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      currentLeads.map((lead) => (
                        <React.Fragment key={lead.customer_id}>
                          <tr 
                            className={`hover:bg-[#2A4B8D]/20 transition-colors cursor-pointer group ${selectedRows.has(lead.customer_id) ? 'bg-[#2A4B8D]/10' : ''}`}
                            onClick={() => setExpandedLead(expandedLead === lead.customer_id ? null : lead.customer_id)}
                          >
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="rounded border-[#2A4B8D] bg-[#0B2447] text-blue-600 focus:ring-blue-500 focus:ring-offset-[#19376D]"
                                checked={selectedRows.has(lead.customer_id)}
                                onChange={() => toggleRowSelect(lead.customer_id)}
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="font-mono text-white text-[13px]">{lead.customer_id}</div>
                              <div className="text-[#B8C0CC] text-xs mt-0.5">{lead.name}</div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border
                                ${lead.tier === 'Hot' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                                  lead.tier === 'Warm' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                  'bg-gray-500/10 text-gray-300 border-gray-500/20'}`}>
                                {lead.tier}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono text-white text-[13px]">{lead.repayment_capacity_score.toFixed(1)}</span>
                                <div className="w-12 h-1.5 bg-[#0B2447] rounded-full overflow-hidden hidden sm:block mt-0.5">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.repayment_capacity_score}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono text-white text-[13px]">{lead.conversion_propensity_score.toFixed(1)}</span>
                                <div className="w-12 h-1.5 bg-[#0B2447] rounded-full overflow-hidden hidden sm:block mt-0.5">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${lead.conversion_propensity_score}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="text-white text-[13px]">{lead.recommended_product}</div>
                              <div className="text-[#B8C0CC] text-xs mt-0.5 font-mono tabular-nums">₹{lead.eligible_loan_amount.toLocaleString()}</div>
                            </td>
                            <td className="px-4 py-2.5">
                              {lead.thin_file ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[11px] font-medium border border-purple-500/20">
                                  Thin File
                                </span>
                              ) : (
                                <span className="text-gray-500 text-xs px-2">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-gray-400 text-right">
                              <div className="flex justify-end">
                                {expandedLead === lead.customer_id ? 
                                  <ChevronUp size={16} className="text-white" /> : 
                                  <ChevronDown size={16} className="group-hover:text-white transition-colors" />
                                }
                              </div>
                            </td>
                          </tr>
                          
                          {/* 5. Expanded Detail Panel */}
                          {expandedLead === lead.customer_id && (
                            <tr>
                              <td colSpan={8} className="p-0 border-b-0">
                                <div className="bg-[#0B2447]/80 px-4 py-5 md:px-6 md:py-6 border-b border-t border-[#2A4B8D] shadow-inner">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
                                    <div className="md:col-span-1">
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-[11px] font-semibold text-[#B8C0CC] uppercase tracking-wider">AI Explanation</h4>
                                        <div className="flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                          <CheckSquare size={10} /> 94% Conf.
                                        </div>
                                      </div>
                                      <p className="text-[13px] text-white bg-[#19376D] p-4 rounded-lg border border-[#2A4B8D] leading-relaxed shadow-sm whitespace-normal">
                                        {lead.explanation_text}
                                      </p>
                                    </div>
                                    <div className="md:col-span-1">
                                      <h4 className="text-[11px] font-semibold text-[#B8C0CC] uppercase tracking-wider mb-3">Top Driving Factors</h4>
                                      <div className="space-y-1.5 bg-[#19376D] p-3 rounded-lg border border-[#2A4B8D] shadow-sm">
                                        {lead.top_factors.map((tf, i) => (
                                          <div key={i} className="flex items-center justify-between py-1 border-b border-[#2A4B8D]/40 last:border-0">
                                            <span className="text-[12px] text-white whitespace-normal pr-4">{tf.factor}</span>
                                            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                              tf.impact === 'positive' 
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                              {tf.impact === 'positive' ? '(+)' : '(-)'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="md:col-span-1 flex flex-col gap-4">
                                      <div>
                                        <h4 className="text-[11px] font-semibold text-[#B8C0CC] uppercase tracking-wider mb-3">Persona Profile</h4>
                                        <span className="text-white bg-[#19376D] px-3 py-1.5 rounded-md border border-[#2A4B8D] text-[13px] font-medium">
                                          {lead.persona_label}
                                        </span>
                                      </div>
                                      <div>
                                        <h4 className="text-[11px] font-semibold text-[#B8C0CC] uppercase tracking-wider mb-3">Recommended Next Action</h4>
                                        <button className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left flex items-center justify-between">
                                          {lead.tier === 'Hot' ? 'Send Pre-approved Offer' : lead.tier === 'Warm' ? 'Schedule Follow-up Call' : 'Nurture via Email'}
                                          <ChevronRight size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-[#2A4B8D] flex items-center justify-between bg-[#0B2447]/30">
                <div className="flex items-center text-xs text-[#B8C0CC]">
                  Showing {sortedLeads.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, sortedLeads.length)} of {sortedLeads.length} leads
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#B8C0CC]">
                    Rows per page:
                    <select 
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="bg-[#19376D] border border-[#2A4B8D] rounded px-1 py-0.5 focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-[#19376D] border border-[#2A4B8D] text-[#B8C0CC] disabled:opacity-50 hover:bg-[#2A4B8D]/50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-[#B8C0CC] px-2">Page {currentPage} of {totalPages || 1}</span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1 rounded bg-[#19376D] border border-[#2A4B8D] text-[#B8C0CC] disabled:opacity-50 hover:bg-[#2A4B8D]/50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Trust Signals (Footer) */}
            <div className="flex items-center justify-between pb-8">
              <div className="flex items-center gap-2 text-[11px] text-[#B8C0CC]">
                <Database size={12} />
                <span>Model Version: RiskEngine v1.4.2</span>
                <span className="mx-2">•</span>
                <span>Last scored: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium tracking-wide">
                <Lock size={10} />
                CONFIDENTIAL — INTERNAL USE ONLY
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Simulate Modal */}
      {isSimulateOpen && (
        <div className="fixed inset-0 bg-[#071A36]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#19376D] rounded-xl shadow-2xl border border-[#2A4B8D] w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-[#2A4B8D] flex items-center justify-between sticky top-0 bg-[#19376D] z-10">
              <h2 className="text-lg font-semibold text-white">Simulate Lead Scoring</h2>
              <button onClick={() => setIsSimulateOpen(false)} className="text-[#B8C0CC] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
              <form onSubmit={handleSimulate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#B8C0CC] uppercase tracking-wide mb-1.5">Monthly Income (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={simForm.monthly_income}
                    onChange={e => setSimForm({...simForm, monthly_income: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-[#0B2447] border border-[#2A4B8D] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B8C0CC] uppercase tracking-wide mb-1.5">Income Type</label>
                  <select 
                    value={simForm.income_type}
                    onChange={e => setSimForm({...simForm, income_type: e.target.value})}
                    className="w-full px-3 py-2 bg-[#0B2447] border border-[#2A4B8D] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white text-sm"
                  >
                    <option value="Salaried">Salaried</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B8C0CC] uppercase tracking-wide mb-1.5">Existing EMI (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={simForm.existing_emi}
                    onChange={e => setSimForm({...simForm, existing_emi: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-[#0B2447] border border-[#2A4B8D] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B8C0CC] uppercase tracking-wide mb-1.5">Recent Calculator Visits</label>
                  <input 
                    type="number" 
                    required
                    value={simForm.recent_calculator_visits}
                    onChange={e => setSimForm({...simForm, recent_calculator_visits: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-[#0B2447] border border-[#2A4B8D] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-white font-mono text-sm"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={simLoading}
                  className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors mt-2 text-sm"
                >
                  {simLoading ? 'Scoring...' : 'Run Simulation'}
                </button>
              </form>
              
              <div className="bg-[#0B2447] rounded-lg p-5 border border-[#2A4B8D] flex flex-col justify-center min-h-[300px]">
                {simulatedLead ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-[#2A4B8D]/50">
                      <span className="text-xs font-medium text-[#B8C0CC] uppercase tracking-wider">Tier</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border
                          ${simulatedLead.tier === 'Hot' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                            simulatedLead.tier === 'Warm' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                            'bg-gray-500/10 text-gray-300 border-gray-500/20'}`}>
                        {simulatedLead.tier}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#B8C0CC]">RCS Score</span>
                        <span className="font-bold text-blue-400 font-mono tabular-nums">{simulatedLead.repayment_capacity_score.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#19376D] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${simulatedLead.repayment_capacity_score}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-[#B8C0CC]">CPS Score</span>
                        <span className="font-bold text-green-400 font-mono tabular-nums">{simulatedLead.conversion_propensity_score.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#19376D] rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${simulatedLead.conversion_propensity_score}%` }} />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#2A4B8D]/50">
                      <p className="text-[13px] text-white leading-relaxed">"{simulatedLead.explanation_text}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#B8C0CC] flex flex-col items-center justify-center h-full">
                    <div className="w-10 h-10 rounded-full bg-[#19376D] border border-[#2A4B8D] flex items-center justify-center mb-3">
                      <Activity size={18} className="text-blue-500/50" />
                    </div>
                    <p className="text-xs">Submit the form to see real-time ML scoring results.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
