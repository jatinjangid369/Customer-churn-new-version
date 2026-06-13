import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader, CheckCircle, AlertCircle, ArrowRight, Download } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import api from '../api/axios'

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', label: '⏳ Pending', icon: '⌛' },
  running: { color: '#3b82f6', label: '🏃 Running', icon: '▶️' },
  completed: { color: '#10b981', label: '✅ Completed', icon: '✓' },
  failed: { color: '#ef4444', label: '❌ Failed', icon: '✗' },
  cancelled: { color: '#6b7280', label: '⊘ Cancelled', icon: 'ⓧ' }
}

function ProgressBar({ progress, color = '#6366f1' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: color,
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>
        {progress}%
      </span>
    </div>
  )
}

export default function TrainingProgressPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch job status every 2 seconds
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/training-jobs/${jobId}/`)
        setJob(res.data)
      } catch (err) {
        setError('Failed to load training job')
      } finally {
        setLoading(false)
      }
    }

    fetch()
    if (!autoRefresh) return

    const interval = setInterval(fetch, 2000)
    return () => clearInterval(interval)
  }, [jobId, autoRefresh])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader size={32} className="spinner" /></div>
  if (!job) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Training job not found</div>

  const isRunning = job.status === 'running'
  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'
  const statusConfig = STATUS_CONFIG[job.status]

  // Feature importance data
  const featureImportanceData = job.feature_importance
    ? Object.entries(job.feature_importance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, importance]) => ({ name, importance: parseFloat((importance * 100).toFixed(2)) }))
    : []

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">🏋️ Training in Progress</h1>
          <p className="page-subtitle">Model: {job.model_config?.name}</p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            padding: '8px 16px',
            background: autoRefresh ? '#6366f1' : '#4b5563',
            border: 'none',
            borderRadius: 6,
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {autoRefresh ? '⏸ Pause' : '▶ Resume'}
        </button>
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

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {/* Status Card */}
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: statusConfig.color }}>
            {statusConfig.label}
          </div>
        </div>

        {/* Progress Card */}
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Progress</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#6366f1' }}>
            {job.progress}%
          </div>
        </div>

        {/* Time Card */}
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Duration</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {job.started_at ? (
              new Date(job.completed_at || new Date()).getTime() -
              new Date(job.started_at).getTime() > 0 ?
                Math.round((new Date(job.completed_at || new Date()).getTime() - new Date(job.started_at).getTime()) / 1000) + 's'
                : '—'
            ) : '—'}
          </div>
        </div>

        {/* Task ID Card */}
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Task ID</div>
          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.celery_task_id?.substring(0, 8)}...
          </div>
        </div>
      </div>

      {/* Main Progress */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700 }}>Training Progress</h3>
        <ProgressBar progress={job.progress} color={job.progress === 100 ? '#10b981' : '#6366f1'} />

        {isRunning && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
            <Loader size={12} className="spinner" />
            Training model, this may take a few minutes...
          </div>
        )}

        {isFailed && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: '#fca5a5',
            fontSize: 12
          }}>
            <strong>Error:</strong> {job.error_message}
          </div>
        )}
      </div>

      {isCompleted && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Accuracy</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>
              {(job.accuracy * 100).toFixed(1)}%
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Precision</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>
              {(job.precision * 100).toFixed(1)}%
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Recall</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>
              {(job.recall * 100).toFixed(1)}%
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(168, 85, 247, 0.05)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>F1 Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#a855f7' }}>
              {(job.f1_score * 100).toFixed(1)}%
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(236, 72, 153, 0.05)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Samples</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ec4899' }}>
              {job.dataset?.rows_count?.toLocaleString() || '—'}
            </div>
          </div>
        </div>
      )}

      {isCompleted && featureImportanceData.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700 }}>Top 10 Important Features</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={featureImportanceData}>
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
                  formatter={(value) => `${value.toFixed(2)}%`}
                />
                <Bar dataKey="importance" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {job.confusion_matrix && (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 700 }}>Confusion Matrix</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                marginBottom: 16
              }}>
                {Object.entries(job.confusion_matrix).map(([key, value]) => {
                  const [actual, predicted] = key.split('_')
                  const isCorrect = actual === predicted
                  return (
                    <div
                      key={key}
                      style={{
                        padding: 12,
                        textAlign: 'center',
                        background: isCorrect
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 6
                      }}
                    >
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                        Actual: {actual === '0' ? 'No Churn' : 'Churn'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                        Predicted: {predicted === '0' ? 'No Churn' : 'Churn'}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: isCorrect ? '#10b981' : '#ef4444' }}>
                        {value}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isCompleted && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate(`/predictions/${jobId}`)}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            Make Predictions <ArrowRight size={14} />
          </button>
          <button
            onClick={() => {
              const apiBase = import.meta.env.VITE_API_URL || '/api';
              window.location.href = `${apiBase}/training-jobs/${jobId}/export/`;
            }}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Export Results <Download size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
