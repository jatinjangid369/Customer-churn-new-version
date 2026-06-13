import { useEffect, useState, useCallback } from 'react'
import { Search, Users, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/axios'

const RISK_COLORS = {
  High: { bg: 'var(--risk-high-bg)', color: 'var(--risk-high)' },
  Medium: { bg: 'var(--risk-medium-bg)', color: 'var(--risk-medium)' },
  Low: { bg: 'var(--risk-low-bg)', color: 'var(--risk-low)' },
}

function RiskBadge({ level }) {
  if (!level) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
  const style = RISK_COLORS[level] || {}
  return (
    <span className={`risk-badge ${level}`}>
      {level === 'High' ? '🔴' : level === 'Medium' ? '🟡' : '🟢'} {level}
    </span>
  )
}

function RiskBar({ score }) {
  if (score == null) return null
  const color = score >= 70 ? 'var(--risk-high)' : score >= 30 ? 'var(--risk-medium)' : 'var(--risk-low)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 38 }}>{score?.toFixed(0)}%</span>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [count, setCount] = useState(0)
  const [riskFilter, setRiskFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (riskFilter) params.risk_level = riskFilter
      if (search) params.search = search
      const res = await api.get('/customers/', { params })
      setCustomers(res.data.results || res.data)
      setCount(res.data.count || 0)
      setTotalPages(Math.ceil((res.data.count || 0) / 20))
    } catch (e) {
      setError('Could not load customers. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [page, riskFilter, search])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleRiskFilter = (risk) => {
    setRiskFilter(risk)
    setPage(1)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customer Intelligence</h1>
        <p className="page-subtitle">
          {count.toLocaleString()} customers · ML-scored risk segmentation
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: '#fca5a5', fontSize: 14
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className="table-container animate-in">
        <div className="table-header">
          <div>
            <div className="table-title">All Customers</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Sorted by created date · Page {page} of {totalPages || 1}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <form onSubmit={handleSearch} className="search-wrap">
              <Search size={14} className="search-icon" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input"
                placeholder="Search customer ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </form>

            {/* Risk filters */}
            <div className="filter-bar">
              {['', 'High', 'Medium', 'Low'].map((r) => (
                <button
                  key={r || 'all'}
                  className={`filter-btn ${(r || 'all').toLowerCase()} ${riskFilter === r ? 'active' : ''}`}
                  onClick={() => handleRiskFilter(r)}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Gender</th>
                <th>Tenure</th>
                <th>Contract</th>
                <th>Monthly Bill</th>
                <th>Status</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px' }}></div>
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">👤</div>
                      <div className="empty-state-text">No customers found</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        Run: python manage.py seed_customers
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary-light)' }}>
                      {c.customer_id}
                    </td>
                    <td>{c.gender}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.tenure}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> mo</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: c.contract === 'Month-to-month' ? 'rgba(239,68,68,0.1)' :
                                    c.contract === 'One year' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                        color: c.contract === 'Month-to-month' ? '#fca5a5' :
                               c.contract === 'One year' ? '#fcd34d' : '#6ee7b7',
                      }}>
                        {c.contract}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{c.monthly_charges?.toFixed(0)}
                    </td>
                    <td>
                      <span>
                        <span className={`status-dot ${c.churn ? 'churned' : 'active'}`}></span>
                        {c.churn ? 'Churned' : 'Active'}
                      </span>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <RiskBar score={c.churn_risk_score} />
                    </td>
                    <td><RiskBadge level={c.risk_level} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, page - 2) + i
              return p <= totalPages ? (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ) : null
            })}
            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
