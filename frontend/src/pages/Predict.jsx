import { useState } from 'react'
import { Brain, Zap } from 'lucide-react'
import api from '../api/axios'

const RISK_CONFIG = {
  High:   { color: 'var(--risk-high)',   bg: 'var(--risk-high-bg)',   emoji: '🔴', label: 'HIGH RISK' },
  Medium: { color: 'var(--risk-medium)', bg: 'var(--risk-medium-bg)', emoji: '🟡', label: 'MEDIUM RISK' },
  Low:    { color: 'var(--risk-low)',    bg: 'var(--risk-low-bg)',    emoji: '🟢', label: 'LOW RISK' },
}

function GaugeMeter({ probability, riskLevel }) {
  const pct = Math.min(100, Math.max(0, probability))
  const angle = (pct / 100) * 180 - 90  // -90 to 90 degrees
  const rad = (angle * Math.PI) / 180
  const r = 75
  const cx = 100, cy = 100

  // Arc endpoint
  const x = cx + r * Math.cos(rad - Math.PI / 2)
  const y = cy + r * Math.sin(rad - Math.PI / 2)

  const color = riskLevel ? RISK_CONFIG[riskLevel]?.color : '#6366f1'

  // Build arc path from left to needle
  const startX = cx - r
  const startY = cy
  const largeArc = pct > 50 ? 1 : 0

  return (
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background track */}
        <path
          d="M 25 100 A 75 75 0 0 1 175 100"
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round"
        />
        {/* Colored fill */}
        <path
          d={`M 25 100 A 75 75 0 ${largeArc} 1 ${x.toFixed(2)} ${y.toFixed(2)}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          style={{ transition: 'all 0.8s ease' }}
        />
        {/* Needle */}
        <circle cx={x} cy={y} r="6" fill={color} style={{ transition: 'all 0.8s ease' }} />
        {/* Value */}
        <text x="100" y="85" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="Inter">
          {pct.toFixed(0)}%
        </text>
        <text x="100" y="105" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">
          CHURN PROBABILITY
        </text>
      </svg>
    </div>
  )
}

const DEFAULT_FORM = {
  gender: 'Male',
  senior_citizen: false,
  partner: false,
  dependents: false,
  tenure: 12,
  phone_service: true,
  internet_service: 'Fiber optic',
  contract: 'Month-to-month',
  paperless_billing: true,
  payment_method: 'Electronic check',
  monthly_charges: 75.0,
  total_charges: 900.0,
}

function Toggle({ label, name, value, onChange }) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">{label}</span>
      <label className="toggle">
        <input type="checkbox" checked={value} onChange={(e) => onChange(name, e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}

export default function Predict() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
    // Auto-calculate total_charges if tenure or monthly changes
    if (name === 'tenure' || name === 'monthly_charges') {
      const t = name === 'tenure' ? value : form.tenure
      const m = name === 'monthly_charges' ? value : form.monthly_charges
      setForm((f) => ({ ...f, [name]: value, total_charges: parseFloat((t * m).toFixed(2)) }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        ...form,
        tenure: parseInt(form.tenure),
        monthly_charges: parseFloat(form.monthly_charges),
        total_charges: parseFloat(form.total_charges),
      }
      const res = await api.post('/predict/', payload)
      setResult(res.data)
    } catch (err) {
      setError(
        err.response?.data?.errors
          ? JSON.stringify(err.response.data.errors, null, 2)
          : 'Prediction failed. Is the backend running?'
      )
    } finally {
      setLoading(false)
    }
  }

  const cfg = result ? RISK_CONFIG[result.risk_level] : null

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Churn Predictor</h1>
        <p className="page-subtitle">
          Enter customer details to get an AI-powered churn risk prediction
        </p>
      </div>

      <div className="predict-layout">
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-card" style={{ marginBottom: 16 }}>
            <div className="form-title">📋 Customer Profile</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={form.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contract Type</label>
                <select className="form-control" value={form.contract} onChange={(e) => handleChange('contract', e.target.value)}>
                  <option>Month-to-month</option>
                  <option>One year</option>
                  <option>Two year</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tenure (months)</label>
                <input
                  type="number" className="form-control" min={0} max={120}
                  value={form.tenure}
                  onChange={(e) => handleChange('tenure', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Internet Service</label>
                <select className="form-control" value={form.internet_service} onChange={(e) => handleChange('internet_service', e.target.value)}>
                  <option>Fiber optic</option>
                  <option>DSL</option>
                  <option>No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Charges (₹)</label>
                <input
                  type="number" className="form-control" min={0} step={0.01}
                  value={form.monthly_charges}
                  onChange={(e) => handleChange('monthly_charges', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Charges (₹)</label>
                <input
                  type="number" className="form-control" min={0} step={0.01}
                  value={form.total_charges}
                  onChange={(e) => handleChange('total_charges', e.target.value)}
                />
              </div>
              <div className="form-group full">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={form.payment_method} onChange={(e) => handleChange('payment_method', e.target.value)}>
                  <option>Electronic check</option>
                  <option>Mailed check</option>
                  <option>Bank transfer (automatic)</option>
                  <option>Credit card (automatic)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-card" style={{ marginBottom: 16 }}>
            <div className="form-title">👤 Demographics</div>
            <Toggle label="Senior Citizen" name="senior_citizen" value={form.senior_citizen} onChange={handleChange} />
            <Toggle label="Has Partner" name="partner" value={form.partner} onChange={handleChange} />
            <Toggle label="Has Dependents" name="dependents" value={form.dependents} onChange={handleChange} />
            <Toggle label="Phone Service" name="phone_service" value={form.phone_service} onChange={handleChange} />
            <Toggle label="Paperless Billing" name="paperless_billing" value={form.paperless_billing} onChange={handleChange} />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '12px 16px', marginBottom: 12, color: '#fca5a5',
              fontSize: 13, whiteSpace: 'pre-wrap'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <><div className="spinner" />&nbsp;Analyzing...</>
            ) : (
              <><Zap size={16} /> Predict Churn Risk</>
            )}
          </button>
        </form>

        {/* Result panel */}
        <div>
          <div className="result-card" style={{
            border: cfg ? `1px solid ${cfg.color}44` : '1px solid var(--border)',
            transition: 'border-color 0.5s ease',
          }}>
            <div className="result-title">Prediction Result</div>

            {!result && !loading && (
              <div style={{ padding: '40px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                <Brain size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>Fill out the form and click<br /><strong>Predict Churn Risk</strong></p>
              </div>
            )}

            {loading && (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Running ML model...</p>
              </div>
            )}

            {result && cfg && (
              <div className="animate-in">
                <GaugeMeter probability={result.churn_probability} riskLevel={result.risk_level} />

                <div className="result-risk" style={{ color: cfg.color }}>
                  {cfg.emoji} {cfg.label}
                </div>

                <div style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}33`,
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  color: cfg.color,
                  fontWeight: 600,
                  marginBottom: 16,
                }}>
                  {result.churn_probability.toFixed(1)}% probability of leaving
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>
                    AI Recommendation
                  </div>
                  <div className="result-recommendation">
                    {result.recommendation}
                  </div>
                </div>

                <div style={{
                  display: 'flex', gap: 8, justifyContent: 'center',
                  padding: '10px 0', borderTop: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Model: <strong style={{ color: 'var(--text-secondary)' }}>{result.model_used}</strong>
                  </span>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    ID: <strong style={{ color: 'var(--text-secondary)' }}>#{result.prediction_id}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="form-card" style={{ marginTop: 16 }}>
            <div className="form-title" style={{ fontSize: 13, marginBottom: 12 }}>⚡ Quick Test Presets</div>
            {[
              { label: '🔴 High Risk Profile', data: { contract: 'Month-to-month', tenure: 2, monthly_charges: 95, internet_service: 'Fiber optic', payment_method: 'Electronic check' } },
              { label: '🟡 Medium Risk Profile', data: { contract: 'One year', tenure: 12, monthly_charges: 65, internet_service: 'DSL', payment_method: 'Mailed check' } },
              { label: '🟢 Low Risk Profile', data: { contract: 'Two year', tenure: 48, monthly_charges: 45, internet_service: 'DSL', payment_method: 'Credit card (automatic)' } },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setForm((f) => ({ ...f, ...preset.data, total_charges: (preset.data.tenure * preset.data.monthly_charges).toFixed(2) }))}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', marginBottom: 6,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13,
                  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
