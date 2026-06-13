import { useEffect, useState } from 'react'
import { Trash2, Play, BarChart3 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '../api/axios'

export default function ModelsPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/training-jobs/')
        setJobs(res.data.results || res.data)
      } catch (err) {
        setError('Failed to load models')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const completedJobs = jobs.filter(j => j.status === 'completed')

  const comparisonData = completedJobs.map(j => ({
    name: j.model_config?.name?.substring(0, 15),
    accuracy: (j.accuracy * 100).toFixed(1),
    precision: (j.precision * 100).toFixed(1),
    recall: (j.recall * 100).toFixed(1),
    f1: (j.f1_score * 100).toFixed(1)
  }))

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading models...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🤖 All Models</h1>
        <p className="page-subtitle">{completedJobs.length} trained models</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 24,
          color: '#fca5a5',
          fontSize: 12
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Model Comparison Chart */}
      {completedJobs.length > 1 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700 }}>📊 Model Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Legend />
              <Bar dataKey="accuracy" fill="#10b981" />
              <Bar dataKey="precision" fill="#3b82f6" />
              <Bar dataKey="recall" fill="#f59e0b" />
              <Bar dataKey="f1" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Models List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {jobs.map(job => {
          const statusColors = {
            completed: '#10b981',
            running: '#3b82f6',
            failed: '#ef4444',
            pending: '#f59e0b'
          }
          const statusEmojis = {
            completed: '✅',
            running: '🏃',
            failed: '❌',
            pending: '⏳'
          }

          return (
            <div
              key={job.id}
              className="card"
              style={{
                borderLeft: `4px solid ${statusColors[job.status]}`,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                    {job.model_config?.name?.substring(0, 40)}
                  </h4>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {statusEmojis[job.status]} {job.status.toUpperCase()}
                  </p>
                </div>
                <div style={{ fontSize: 20 }}>
                  {job.model_config?.model_type === 'rf' && '🌲'}
                  {job.model_config?.model_type === 'lr' && '📈'}
                  {job.model_config?.model_type === 'xgb' && '⚡'}
                  {job.model_config?.model_type === 'lgb' && '💡'}
                </div>
              </div>

              {job.status === 'completed' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  marginBottom: 12,
                  padding: '12px 0',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Accuracy</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                      {(job.accuracy * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>F1 Score</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>
                      {(job.f1_score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {job.status === 'running' && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    height: 6,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${job.progress}%`,
                        background: '#3b82f6',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    {job.progress}% complete
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                <p>🗂️ Dataset: {job.dataset?.name}</p>
                <p>📅 {new Date(job.created_at).toLocaleDateString()}</p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {job.status === 'completed' && (
                  <>
                    <button
                      onClick={() => window.location.href = `/predictions/${job.id}`}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: '#6366f1',
                        border: 'none',
                        borderRadius: 4,
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <Play size={10} /> Predict
                    </button>
                    <button
                      onClick={() => window.location.href = `/training-progress/${job.id}`}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 4,
                        color: '#a5b4fc',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <BarChart3 size={10} /> Details
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {jobs.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Models Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Upload a dataset and train your first model to get started!
          </p>
        </div>
      )}
    </div>
  )
}
