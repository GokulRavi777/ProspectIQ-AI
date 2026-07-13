import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: 'asc' | 'desc' } | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, metricsRes] = await Promise.all([
          client.GET("/leads"),
          client.GET("/metrics")
        ]);
        
        if (leadsRes.data) {
          setLeads(leadsRes.data as Lead[]);
        }
        if (metricsRes.data) {
          setMetrics(metricsRes.data as Metrics);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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

  const filteredLeads = leads.filter(lead => 
    lead.customer_id.toLowerCase().includes(search.toLowerCase()) || 
    lead.name.toLowerCase().includes(search.toLowerCase())
  );

  const sortedLeads = React.useMemo(() => {
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">ProspectIQ Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>

        {/* Metrics Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 font-medium">Total Leads Scored</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{metrics.total_leads_scored}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 font-medium">Hot Leads</div>
              <div className="mt-2 text-3xl font-bold text-orange-600">{metrics.hot_leads_count}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 font-medium">Thin File Coverage</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{(metrics.thin_file_coverage_pct * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 font-medium">Conversion Lift</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{metrics.conversion_lift_multiple}x</div>
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Scored Leads</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by ID or Name..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium cursor-pointer" onClick={() => handleSort('customer_id')}>ID/Name</th>
                  <th className="px-6 py-4 font-medium cursor-pointer" onClick={() => handleSort('tier')}>Tier</th>
                  <th className="px-6 py-4 font-medium cursor-pointer" onClick={() => handleSort('repayment_capacity_score')}>RCS Score</th>
                  <th className="px-6 py-4 font-medium cursor-pointer" onClick={() => handleSort('conversion_propensity_score')}>CPS Score</th>
                  <th className="px-6 py-4 font-medium">Product / Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedLeads.map((lead) => (
                  <tr key={lead.customer_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lead.customer_id}</div>
                      <div className="text-gray-500">{lead.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${lead.tier === 'Hot' ? 'bg-orange-100 text-orange-800' : 
                          lead.tier === 'Warm' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {lead.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${lead.repayment_capacity_score}%` }} 
                          />
                        </div>
                        <span className="font-medium">{lead.repayment_capacity_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${lead.conversion_propensity_score}%` }} 
                          />
                        </div>
                        <span className="font-medium">{lead.conversion_propensity_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lead.recommended_product}</div>
                      <div className="text-gray-500">₹{lead.eligible_loan_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.thin_file ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                          Thin File
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
