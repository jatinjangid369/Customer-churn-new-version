import { useEffect, useState, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from 'recharts'
import {
  Users, UserX, UserCheck, TrendingDown,
  DollarSign, AlertTriangle, Activity, RefreshCw
} from 'lucide-react'
import api from '../api/axios'

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="tooltip-custom" style={{
        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '10px 14px', fontSize: 12,
      }}>
        {label && <p style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 700, marginBottom: 2 }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
            {p.name === 'Churn Rate' || p.name === 'churn_rate' ? '%' : ''}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function KPICard({ label, value, sub, colorClass, icon: Icon, loading }) {
  return (
    <div className={`kpi-card ${colorClass} animate-in`}>
      <div className={`kpi-icon-wrap ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div className="kpi-label">{label}</div>
      {loading ? (
        <div className="kpi-value" style={{ fontSize: 20, color: 'var(--text-muted)' }}>—</div>
      ) : (
        <div className="kpi-value">{value}</div>
      )}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

const PIE_COLORS = ['#ef4444', '#10b981']
const BAR_COLORS = { 'Month-to-month': '#ef4444', 'One year': '#f59e0b', 'Two year': '#10b981' }
const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [contractData, setContractData] = useState([])
  const [tenureData, setTenureData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ovRes, ctRes, tenRes, trRes] = await Promise.all([
        api.get('/dashboard/'),
        api.get('/analytics/contract/'),
        api.get('/analytics/tenure/'),
        api.get('/analytics/trend/'),
      ])
      setOverview(ovRes.data)
      setContractData(ctRes.data)
      setTenureData(tenRes.data)
      setTrendData(trRes.data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      setError('Backend offline — start the Django server first.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const pieData = overview ? [
    { name: 'Churned', value: overview.churned_customers },
    { name: 'Retained', value: overview.active_customers },
  ] : []

  const riskData = overview ? [
    { name: 'High Risk', value: overview.risk_distribution?.high || 0, fill: '#ef4444' },
    { name: 'Medium Risk', value: overview.risk_distribution?.medium || 0, fill: '#f59e0b' },
    { name: 'Low Risk', value: overview.risk_distribution?.low || 0, fill: '#10b981' },
  ] : []

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">
            Real-time customer intelligence · {lastUpdated ? `Updated ${lastUpdated}` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 14px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontFamily: 'var(--font)',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: '#fca5a5', fontSize: 14
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid">
        <KPICard label="Total Customers" value={overview?.total_customers?.toLocaleString() ?? '—'} sub="All registered" colorClass="indigo" icon={Users} loading={loading} />
        <KPICard label="Active Customers" value={overview?.active_customers?.toLocaleString() ?? '—'} sub="Currently retained" colorClass="green" icon={UserCheck} loading={loading} />
        <KPICard label="Churned" value={overview?.churned_customers?.toLocaleString() ?? '—'} sub="Left the service" colorClass="red" icon={UserX} loading={loading} />
        <KPICard label="Churn Rate" value={overview ? `${overview.churn_rate}%` : '—'} sub="Industry avg ~5-7%" colorClass="amber" icon={TrendingDown} loading={loading} />
        <KPICard label="Avg Monthly Bill" value={overview ? `₹${overview.avg_monthly_charges}` : '—'} sub="Per customer" colorClass="cyan" icon={DollarSign} loading={loading} />
        <KPICard label="Revenue at Risk" value={overview ? `₹${overview.revenue_lost_monthly?.toLocaleString()}` : '—'} sub="Monthly churned revenue" colorClass="red" icon={AlertTriangle} loading={loading} />
      </div>

      {/* Charts Row 1 */}
      <div className="charts-grid">
        {/* Pie chart */}
        <div className="chart-card">
          <div className="chart-title">Churn Distribution</div>
          <div className="chart-subtitle">Retained vs churned customers</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(val, entry) => (
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}: {entry.payload.value?.toLocaleString()}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution */}
        <div className="chart-card">
          <div className="chart-title">Risk Segmentation</div>
          <div className="chart-subtitle">Customer risk levels (ML-predicted)</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {riskData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(val, entry) => (
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}: {entry.payload.value?.toLocaleString()}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar chart — Contract Type */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-title">Churn Rate by Contract Type</div>
        <div className="chart-subtitle">Month-to-month contracts have significantly higher churn</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={contractData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="contract" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="churn_rate" name="Churn Rate" radius={[6,6,0,0]}>
              {contractData.map((entry, i) => (
                <Cell key={i} fill={BAR_COLORS[entry.contract] || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart — Tenure vs Churn */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        <div className="chart-title">Churn Rate by Tenure</div>
        <div className="chart-subtitle">Newer customers churn at much higher rates — focus retention on 0-12 month cohort</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={tenureData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="bucket" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="churn_rate" name="Churn Rate" stroke="#ef4444" fill="url(#churnGrad)" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly trend */}
      <div className="chart-card">
        <div className="chart-title">Monthly Churn Trend</div>
        <div className="chart-subtitle">Churned vs retained customers across time cohorts</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}</span>} />
            <Line type="monotone" dataKey="churned" name="Churned" stroke="#ef4444" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="retained" name="Retained" stroke="#10b981" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
