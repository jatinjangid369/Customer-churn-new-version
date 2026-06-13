import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader, Download, Eye, AlertCircle } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../api/axios'

export default function PredictionsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [trainingJob, setTrainingJob] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const fetch = async () => {
      try {
        const jobRes = await api.get(`/training-jobs/${jobId}/`)
        setTrainingJob(jobRes.data)

        const predRes = await api.get(`/predictions/?training_job_id=${jobId}&page=${page}&limit=${pageSize}`)
        setPredictions(predRes.data.results || [])

        // Get stats
        const statsRes = await api.get(`/analytics/summary/`)
        setStats(statsRes.data)
      } catch (err) {
        setError('Failed to load predictions')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [jobId, page, pageSize])

  const handleRunPredictions = async () => {
    setPredicting(true)
    try {
      await api.post('/predictions/predict-batch/', { training_job_id: jobId })
      // Refresh predictions
      const res = await api.get(`/predictions/?training_job_id=${jobId}`)
      setPredictions(res.data.results || [])
    } catch (err) {
      setError('Failed to run predictions')
    } finally {
      setPredicting(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await api.get(`/predictions/export/?training_job_id=${jobId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res)
      const a = document.createElement('a')
      a.href = url
      a.download = `predictions_${jobId}.csv`
      a.click()
    } catch (err) {
      setError('Failed to export predictions')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader size={32} className="spinner" /></div>
  if (!trainingJob) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Training job not found</div>

  const riskCounts = {
    high: predictions.filter(p => p.churn_probability >= 0.8).length,
    medium: predictions.filter(p => p.churn_probability >= 0.5 && p.churn_probability < 0.8).length,
    low: predictions.filter(p => p.churn_probability < 0.5).length
  }

  const riskData = [
    { name: 'High Risk', value: riskCounts.high, fill: '#ef4444' },
    { name: 'Medium Risk', value: riskCounts.medium, fill: '#f59e0b' },
    { name: 'Low Risk', value: riskCounts.low, fill: '#10b981' }
  ]

  const probDistribution = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((_, i) => {
    const min = i * 0.1
    const max = (i + 1) * 0.1
    const count = predictions.filter(p => p.churn_probability >= min && p.churn_probability < max).length
    return { range: `${(min * 100).toFixed(0)}-${(max * 100).toFixed(0)}%`, count }
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔮 Batch Predictions</h1>
        <p className="page-subtitle">{predictions.length} customers scored</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 24,
          color: '#fca5a5',
          fontSize: 12,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {predictions.length === 0 && !predicting && (
        <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Predictions Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Run batch predictions on the dataset to identify at-risk customers
          </p>
          <button
            onClick={handleRunPredictions}
            disabled={predicting}
            className="btn-primary"
          >
            {predicting && <Loader size={14} className="spinner" />}
            Run Predictions
          </button>
        </div>
      )}

      {predictions.length > 0 && (
        <>
          {/* Stats Row */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Customers</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{predictions.length}</div>
            </div>

            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>🔴 High Risk</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{riskCounts.high}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {((riskCounts.high / predictions.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>🟡 Medium Risk</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{riskCounts.medium}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {((riskCounts.medium / predictions.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>🟢 Low Risk</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{riskCounts.low}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {((riskCounts.low / predictions.length) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700 }}>Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a2e',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700 }}>Probability Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={probDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="range"
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a2e',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High Risk Customers */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700 }}>🔴 High Risk Customers ({riskCounts.high})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Customer ID</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Churn Probability</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.filter(p => p.churn_probability >= 0.8).slice(0, 10).map(pred => (
                    <tr key={pred.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: 8 }}>{pred.customer_id}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          borderRadius: 4,
                          color: '#ef4444',
                          fontWeight: 600
                        }}>
                          {(pred.churn_probability * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: 8, color: '#ef4444' }}>🔴 At Risk</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {riskCounts.high > 10 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
                  ... and {riskCounts.high - 10} more. Export to see all.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleExport} className="btn-secondary" style={{ flex: 1 }}>
              <Download size={14} />
              Export as CSV
            </button>
            <button onClick={() => navigate('/models')} className="btn-primary" style={{ flex: 1 }}>
              <Eye size={14} />
              View All Models
            </button>
          </div>
        </>
      )}
    </div>
  )
}
