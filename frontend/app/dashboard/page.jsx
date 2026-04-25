"use client"

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  
  const [dashboardStats, setDashboardStats] = useState(null);
  const [fields, setFields] = useState([]);
  const [agents, setAgents] = useState([]); 
  const [userRole, setUserRole] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [manageModal, setManageModal] = useState({ isOpen: false, field: null, tab: 'edit' }); 
  const [updateModal, setUpdateModal] = useState({ isOpen: false, field: null }); 
  const [historyModal, setHistoryModal] = useState({ isOpen: false, field: null, updates: [], loading: false });

  const initialFieldState = { name: '', crop_type: '', planting_date: '', expected_harvest_month: '', expected_harvest_year: new Date().getFullYear().toString(), current_stage: 'planted' };
  const [newField, setNewField] = useState(initialFieldState);
  const [editField, setEditField] = useState({});
  const [agentUpdateData, setAgentUpdateData] = useState({ new_stage: '', notes: '' });

  const [assignMode, setAssignMode] = useState('existing'); // 'existing' | 'new'
  const [assignAgentData, setAssignAgentData] = useState({ agent_id: '' });
  const [newAgentData, setNewAgentData] = useState({ first_name: '', last_name: '', email: '' });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [statsRes, fieldsRes, agentsRes] = await Promise.all([
          fetch('https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/dashboard', { credentials: 'include' }),
          fetch('https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/', { credentials: 'include' }),
          fetch('https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/agents', { credentials: 'include' }) 
        ]);

        if (statsRes.status === 401 || fieldsRes.status === 401) {
          if (isMounted) router.push('/auth');
          return;
        }

        const statsData = await statsRes.json();
        const fieldsData = await fieldsRes.json();
        
        if (isMounted) {
          if (statsData.success && fieldsData.success) {
            setDashboardStats(statsData.data);
            setFields(fieldsData.fields);
            
            if (agentsRes.ok) {
              const agentsData = await agentsRes.json();
              setUserRole('admin');
              setAgents(agentsData.agents);
            } else {
              setUserRole('field_agent');
            }
          } else {
            setError('Failed to load dashboard data.');
          }
        }
      } catch (err) {
        if (isMounted) setError('Network error. Please ensure the server is running.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [refreshKey, router]);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const handleCreateField = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newField)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreateModalOpen(false);
        setNewField(initialFieldState);
        triggerRefresh();
      } else alert(data.error || data.msg);
    } catch (err) { alert('Error creating field.'); } 
    finally { setActionLoading(false); }
  };

  const handleEditField = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        name: editField.name,
        crop_type: editField.crop_type,
        expected_harvest_month: editField.expected_harvest_month,
        expected_harvest_year: parseInt(editField.expected_harvest_year)
      };

      const res = await fetch(`https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/${manageModal.field.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setManageModal({ isOpen: false, field: null, tab: 'edit' });
        triggerRefresh();
      } else alert(data.error || data.msg);
    } catch (err) { alert('Error editing field.'); }
    finally { setActionLoading(false); }
  };

  const handleAssignAgent = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let endpoint = '';
      let method = '';
      let payload = {};

      if (assignMode === 'existing') {
        endpoint = manageModal.field.assigned_agent_id 
          ? `/api/v1/fields/${manageModal.field.id}/reassign`
          : `/api/v1/fields/${manageModal.field.id}/assign-agent`;
        method = manageModal.field.assigned_agent_id ? 'PATCH' : 'POST';
        payload = manageModal.field.assigned_agent_id 
          ? { new_agent_id: assignAgentData.agent_id }
          : { agent_id: assignAgentData.agent_id };
      } else {
        // Create new agent flow
        endpoint = `/api/v1/fields/${manageModal.field.id}/assign-agent`;
        method = 'POST';
        payload = {
          first_name: newAgentData.first_name,
          last_name: newAgentData.last_name,
          email: newAgentData.email
        };
      }

      const res = await fetch(`https://smart-season-field-monitoring-system-lgto.onrender.com${endpoint}`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setManageModal({ isOpen: false, field: null, tab: 'edit' });
        setNewAgentData({ first_name: '', last_name: '', email: '' });
        triggerRefresh();
      } else alert(data.error || data.msg);
    } catch (err) { alert('Error assigning agent.'); }
    finally { setActionLoading(false); }
  };

  const handleDeleteField = async () => {
    if (!confirm(`Are you sure you want to delete ${manageModal.field.name}? This action cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/${manageModal.field.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setManageModal({ isOpen: false, field: null, tab: 'edit' });
        triggerRefresh();
      } else alert('Failed to delete field.');
    } catch (err) { alert('Error deleting field.'); }
    finally { setActionLoading(false); }
  };

  const handleAgentUpdateField = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/${updateModal.field.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(agentUpdateData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUpdateModal({ isOpen: false, field: null });
        setAgentUpdateData({ new_stage: '', notes: '' });
        triggerRefresh();
      } else alert(data.error || data.msg);
    } catch (err) { alert('Error updating field.'); }
    finally { setActionLoading(false); }
  };

  const handleViewHistory = async (field) => {
    setHistoryModal({ isOpen: true, field, updates: [], loading: true });
    try {
      const res = await fetch(`https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/fields/${field.id}/updates`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setHistoryModal({ isOpen: true, field, updates: data.updates, loading: false });
      }
    } catch (err) {
      alert("Failed to load history.");
      setHistoryModal({ isOpen: false, field: null, updates: [], loading: false });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('https://smart-season-field-monitoring-system-lgto.onrender.com/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/auth');
    } catch (err) { console.error("Logout failed"); }
  };

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'at risk': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStageBadge = (stage) => {
    switch(stage?.toLowerCase()) {
      case 'planted': return 'bg-slate-100 text-slate-600';
      case 'growing': return 'bg-teal-100 text-teal-700';
      case 'ready': return 'bg-emerald-100 text-emerald-700';
      case 'harvested': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex">
      <Head><title>Dashboard | SmartSeason</title></Head>

      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">SmartSeason</span>
        </div>
        
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role Access</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'}`}></div>
            <span className="text-sm font-medium text-slate-300 capitalize">{userRole?.replace('_', ' ')}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'overview' ? 'bg-emerald-600/10 text-emerald-400' : 'hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /></svg>
            Overview
          </button>
          <button onClick={() => setActiveTab('fields')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${activeTab === 'fields' ? 'bg-emerald-600/10 text-emerald-400' : 'hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Directory
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab}</h1>
            <p className="text-sm text-slate-500">
              {userRole === 'admin' ? 'Manage your fields and coordinate agents.' : 'Monitor and update your assigned fields.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {userRole === 'admin' && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Field
              </button>
            )}
          </div>
        </header>

        {error && <div className="m-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>}

        <div className="flex-1 overflow-auto p-8">
          
          {activeTab === 'overview' && dashboardStats && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Fields</div>
                  <div className="text-4xl font-black text-slate-900">{dashboardStats.total_fields}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10"></div>
                  <div className="text-emerald-600 text-sm font-semibold uppercase tracking-wider mb-2">Active</div>
                  <div className="text-4xl font-black text-slate-900">{dashboardStats.status_breakdown.active}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm shadow-amber-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10"></div>
                  <div className="text-amber-600 text-sm font-semibold uppercase tracking-wider mb-2">At Risk</div>
                  <div className="text-4xl font-black text-slate-900">{dashboardStats.status_breakdown['at risk']}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
                  <div className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-2">Upcoming Harvests</div>
                  <div className="text-4xl font-black text-slate-900">{dashboardStats.insights.upcoming_harvests_this_month}</div>
                </div>
              </div>

              {dashboardStats.insights.action_required.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Action Required: At Risk Fields
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {dashboardStats.insights.action_required.map(field => (
                      <div key={field.id} className="bg-white p-4 rounded-xl border border-amber-100 flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-slate-900">{field.name}</div>
                          <div className="text-xs text-slate-500 uppercase font-semibold mt-1">Stuck in: {field.stage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'fields' || activeTab === 'overview') && (
            <div className={`max-w-7xl mx-auto ${activeTab === 'overview' ? 'mt-12' : ''}`}>
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-bold text-slate-900">Field Directory</h2>
              </div>
              
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
                      <tr>
                        <th className="px-6 py-4">Field Name</th>
                        <th className="px-6 py-4">Current Stage</th>
                        <th className="px-6 py-4">System Status</th>
                        <th className="px-6 py-4">Assigned Agent</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fields.length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No fields assigned/created yet.</td></tr>
                      ) : (
                        fields.map(field => (
                          <tr key={field.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{field.name}</div>
                              <div className="text-xs text-slate-500">{field.crop_type}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStageBadge(field.current_stage)}`}>
                                {field.current_stage}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadge(field.status)}`}>
                                {field.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {field.assigned_agent_name || <span className="text-slate-400 italic">Unassigned</span>}
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-3">
                              <button onClick={() => handleViewHistory(field)} className="text-slate-500 font-bold text-sm hover:text-slate-700">History</button>
                              
                              {userRole === 'admin' ? (
                                <button 
                                  onClick={() => { setEditField(field); setManageModal({ isOpen: true, field, tab: 'edit' }); }} 
                                  className="text-emerald-600 font-bold text-sm hover:text-emerald-800"
                                >
                                  Manage
                                </button>
                              ) : (
                                <button 
                                  onClick={() => { setAgentUpdateData({ new_stage: field.current_stage, notes: '' }); setUpdateModal({ isOpen: true, field }); }}
                                  className="text-emerald-600 font-bold text-sm hover:text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md"
                                >
                                  Update Stage
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">Register New Field</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateField} className="p-8 overflow-y-auto space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Field Name</label>
                <input required type="text" value={newField.name} onChange={(e) => setNewField({...newField, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Crop Type</label>
                <input required type="text" value={newField.crop_type} onChange={(e) => setNewField({...newField, crop_type: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Planting Date</label>
                  <input required type="text" value={newField.planting_date} onChange={(e) => setNewField({...newField, planting_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium" placeholder="DD-MM-YYYY" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Stage</label>
                  <select value={newField.current_stage} onChange={(e) => setNewField({...newField, current_stage: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium">
                    <option value="planted">Planted</option>
                    <option value="growing">Growing</option>
                    <option value="ready">Ready</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exp. Harvest Month</label>
                  <input required type="text" value={newField.expected_harvest_month} onChange={(e) => setNewField({...newField, expected_harvest_month: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium" placeholder="e.g. October" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exp. Harvest Year</label>
                  <input required type="number" value={newField.expected_harvest_year} onChange={(e) => setNewField({...newField, expected_harvest_year: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 font-medium" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-70">
                  {actionLoading ? 'Saving...' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageModal.isOpen && manageModal.field && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{manageModal.field.name}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Administration</p>
              </div>
              <button onClick={() => setManageModal({ isOpen: false, field: null })} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex border-b border-slate-200">
              <button onClick={() => setManageModal({...manageModal, tab: 'edit'})} className={`flex-1 py-3 text-sm font-bold ${manageModal.tab === 'edit' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>Edit Details</button>
              <button onClick={() => setManageModal({...manageModal, tab: 'assign'})} className={`flex-1 py-3 text-sm font-bold ${manageModal.tab === 'assign' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}>Assignment</button>
              <button onClick={() => setManageModal({...manageModal, tab: 'danger'})} className={`flex-1 py-3 text-sm font-bold ${manageModal.tab === 'danger' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500'}`}>Danger Zone</button>
            </div>

            <div className="p-8">
              {manageModal.tab === 'edit' && (
                <form onSubmit={handleEditField} className="space-y-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                    <input type="text" value={editField.name || ''} onChange={e => setEditField({...editField, name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Crop Type</label>
                    <input type="text" value={editField.crop_type || ''} onChange={e => setEditField({...editField, crop_type: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Exp. Month (Int)</label>
                      <input type="text" value={editField.expected_harvest_month || ''} onChange={e => setEditField({...editField, expected_harvest_month: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Exp. Year</label>
                      <input type="number" value={editField.expected_harvest_year || ''} onChange={e => setEditField({...editField, expected_harvest_year: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={actionLoading} className="w-full mt-4 bg-emerald-600 text-white p-3 rounded-xl font-bold">Save Changes</button>
                </form>
              )}

              {manageModal.tab === 'assign' && (
                <form onSubmit={handleAssignAgent} className="space-y-5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                    <span className="font-bold block mb-1">Current Assignment:</span> 
                    {manageModal.field.assigned_agent_name || 'No agent currently assigned'}
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button type="button" onClick={() => setAssignMode('existing')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${assignMode === 'existing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Existing Agent</button>
                    <button type="button" onClick={() => setAssignMode('new')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${assignMode === 'new' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Create New Agent</button>
                  </div>

                  {assignMode === 'existing' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Select from Roster</label>
                      <select required value={assignAgentData.agent_id} onChange={e => setAssignAgentData({agent_id: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none font-medium">
                        <option value="" disabled>Select an agent...</option>
                        {agents.map(agent => (
                          <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name} ({agent.email})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                          <input required type="text" value={newAgentData.first_name} onChange={e => setNewAgentData({...newAgentData, first_name: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
                          <input required type="text" value={newAgentData.last_name} onChange={e => setNewAgentData({...newAgentData, last_name: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white outline-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email Address (Login)</label>
                        <input required type="email" value={newAgentData.email} onChange={e => setNewAgentData({...newAgentData, email: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-200 bg-white outline-none" />
                        <p className="text-[10px] text-slate-500 mt-1">* An email will be sent via Resend for them to set a password.</p>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={actionLoading} className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors">
                    {actionLoading ? 'Processing...' : (assignMode === 'new' ? 'Create Agent & Assign' : 'Confirm Assignment')}
                  </button>
                </form>
              )}

              {manageModal.tab === 'danger' && (
                <div className="space-y-4 text-center py-4">
                  <p className="text-slate-600 mb-4">Deleting this field will permanently remove it and all of its update history.</p>
                  <button onClick={handleDeleteField} disabled={actionLoading} className="w-full bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-colors p-3 rounded-xl font-bold border border-red-200">
                    Delete Field Permanently
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {updateModal.isOpen && updateModal.field && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Update Field Status</h3>
              <button onClick={() => setUpdateModal({ isOpen: false, field: null })} className="text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAgentUpdateField} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Growth Stage</label>
                <select value={agentUpdateData.new_stage} onChange={e => setAgentUpdateData({...agentUpdateData, new_stage: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none font-medium">
                  <option value="planted">Planted</option>
                  <option value="growing">Growing</option>
                  <option value="ready">Ready</option>
                  <option value="harvested">Harvested</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Field Notes / Observations</label>
                <textarea required rows="4" value={agentUpdateData.notes} onChange={e => setAgentUpdateData({...agentUpdateData, notes: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none" placeholder="E.g., Signs of pest damage, ready for fertilizer..."></textarea>
              </div>
              <button type="submit" disabled={actionLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold shadow-md">
                {actionLoading ? 'Submitting...' : 'Submit Update'}
              </button>
            </form>
          </div>
        </div>
      )}

      {historyModal.isOpen && historyModal.field && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Update History</h3>
                <p className="text-xs text-slate-500">{historyModal.field.name}</p>
              </div>
              <button onClick={() => setHistoryModal({ isOpen: false, field: null, updates: [], loading: false })} className="text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              {historyModal.loading ? (
                <div className="text-center py-10 text-slate-500">Loading history...</div>
              ) : historyModal.updates.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No updates recorded for this field yet.</div>
              ) : (
                <div className="space-y-4">
                  {historyModal.updates.map((update) => (
                    <div key={update.id} className="relative pl-6 border-l-2 border-slate-200 pb-4 last:border-0 last:pb-0">
                      <div className="absolute top-0 -left-2.25 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-50"></div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStageBadge(update.new_stage)}`}>
                            {update.new_stage}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{new Date(update.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{update.notes}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 italic">Logged by {update.updated_by_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}