import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { Search, LogOut, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
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
  
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  
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

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimulatedLead(null);
    try {
      const res = await client.POST("/simulate", {
        body: {
          monthly_income: Number(simForm.monthly_income),
          income_type: simForm.income_type as "Salaried" | "Self-Employed" | "Business",
          existing_emi: Number(simForm.existing_emi),
          recent_calculator_visits: Number(simForm.recent_calculator_visits)
        }
      });
      if (res.data) {
        setSimulatedLead(res.data as Lead);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
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
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSimulateOpen(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span>Simulate Lead</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-4 py-2"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
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
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedLeads.map((lead) => (
                  <React.Fragment key={lead.customer_id}>
                    <tr 
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => setExpandedLead(expandedLead === lead.customer_id ? null : lead.customer_id)}
                    >
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
                      <td className="px-6 py-4 text-gray-400">
                        {expandedLead === lead.customer_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </td>
                    </tr>
                    
                    {/* Expanded Detail Panel */}
                    {expandedLead === lead.customer_id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-6 bg-slate-50 border-t border-slate-100 shadow-inner">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Explanation</h4>
                              <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border border-gray-200 leading-relaxed shadow-sm">
                                {lead.explanation_text}
                              </p>
                              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                <span className="font-medium text-gray-700">Persona Profile:</span> 
                                {lead.persona_label}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Driving Factors</h4>
                              <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                {lead.top_factors.map((tf, i) => (
                                  <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{tf.factor}</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      tf.impact === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {tf.impact === 'positive' ? '+ Positive' : '- Negative'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Simulate Modal */}
      {isSimulateOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Simulate Lead Scoring</h2>
              <button onClick={() => setIsSimulateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <form onSubmit={handleSimulate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={simForm.monthly_income}
                    onChange={e => setSimForm({...simForm, monthly_income: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Income Type</label>
                  <select 
                    value={simForm.income_type}
                    onChange={e => setSimForm({...simForm, income_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Salaried">Salaried</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Existing EMI (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={simForm.existing_emi}
                    onChange={e => setSimForm({...simForm, existing_emi: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recent Calculator Visits</label>
                  <input 
                    type="number" 
                    required
                    value={simForm.recent_calculator_visits}
                    onChange={e => setSimForm({...simForm, recent_calculator_visits: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={simLoading}
                  className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {simLoading ? 'Scoring...' : 'Run Simulation'}
                </button>
              </form>
              
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 flex flex-col justify-center">
                {simulatedLead ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Tier</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${simulatedLead.tier === 'Hot' ? 'bg-orange-100 text-orange-800' : 
                            simulatedLead.tier === 'Warm' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                        {simulatedLead.tier}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">RCS</span>
                        <span className="font-bold text-blue-600">{simulatedLead.repayment_capacity_score.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${simulatedLead.repayment_capacity_score}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">CPS</span>
                        <span className="font-bold text-green-600">{simulatedLead.conversion_propensity_score.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${simulatedLead.conversion_propensity_score}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-600 italic">"{simulatedLead.explanation_text}"</p>
                    </div>
                    
                    <div className="pt-2 space-y-2">
                      {simulatedLead.top_factors.map((tf, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">{tf.factor}</span>
                          <span className={tf.impact === 'positive' ? 'text-green-600' : 'text-red-600'}>
                            {tf.impact === 'positive' ? '(+)' : '(-)'}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <p className="text-sm">Submit the form to see real-time ML scoring results.</p>
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
