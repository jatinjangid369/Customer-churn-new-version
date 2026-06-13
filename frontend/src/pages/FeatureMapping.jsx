import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../api/axios'

export default function FeatureMappingPage() {
  const { datasetId } = useParams()
  const navigate = useNavigate()

  const [dataset, setDataset] = useState(null)
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapping, setMapping] = useState({
    customer_id_column: '',
    target_column: '',
    feature_columns: [],
    categorical_columns: [],
    numerical_columns: [],
    missing_value_strategy: 'drop'
  })
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const res = await api.get(`/datasets/${datasetId}/`)
        setDataset(res.data)
        const cols = res.data.columns_list || []
        setColumns(cols)
        setMapping(m => ({ ...m, feature_columns: cols }))
      } catch (err) {
        setError('Failed to load dataset')
      } finally {
        setLoading(false)
      }
    }
    fetchDataset()
  }, [datasetId])

  const toggleFeature = (col) => {
    setMapping(m => ({
      ...m,
      feature_columns: m.feature_columns.includes(col)
        ? m.feature_columns.filter(c => c !== col)
        : [...m.feature_columns, col]
    }))
  }

  const toggleCategorical = (col) => {
    setMapping(m => ({
      ...m,
      categorical_columns: m.categorical_columns.includes(col)
        ? m.categorical_columns.filter(c => c !== col)
        : [...m.categorical_columns, col]
    }))
  }

  const toggleNumerical = (col) => {
    setMapping(m => ({
      ...m,
      numerical_columns: m.numerical_columns.includes(col)
        ? m.numerical_columns.filter(c => c !== col)
        : [...m.numerical_columns, col]
    }))
  }

  const handleValidate = async () => {
    if (!mapping.customer_id_column || !mapping.target_column || mapping.feature_columns.length === 0) {
      setValidationResult({ valid: false, message: 'Fill all required fields' })
      return
    }

    setValidating(true)
    try {
      const res = await api.post(`/feature-mappings/${datasetId}/validate/`, mapping)
      setValidationResult(res.data)
    } catch (err) {
      setValidationResult({ valid: false, message: 'Validation failed' })
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.post('/feature-mappings/', {
        dataset: datasetId,
        ...mapping
      })
      setTimeout(() => navigate(`/training/${res.data.id}`), 1000)
    } catch (err) {
      setError('Failed to save mapping')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader size={32} className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔗 Feature Mapping</h1>
        <p className="page-subtitle">{dataset?.name} • {columns.length} columns</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Configuration */}
        <div>
          {/* Customer ID */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>📍 Customer ID Column</h3>
            <select
              value={mapping.customer_id_column}
              onChange={(e) => setMapping(m => ({ ...m, customer_id_column: e.target.value }))}
              className="input"
            >
              <option value="">Select column...</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Target Column */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>🎯 Target Column (Churn)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Should be 0/1, Yes/No, True/False, Churned/Not Churned, etc.
            </p>
            <select
              value={mapping.target_column}
              onChange={(e) => setMapping(m => ({ ...m, target_column: e.target.value }))}
              className="input"
            >
              <option value="">Select column...</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Missing Value Strategy */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>⚠️ Missing Values Strategy</h3>
            <select
              value={mapping.missing_value_strategy}
              onChange={(e) => setMapping(m => ({ ...m, missing_value_strategy: e.target.value }))}
              className="input"
            >
              <option value="drop">Drop rows with missing values</option>
              <option value="mean">Fill with mean (numerical)</option>
              <option value="median">Fill with median (numerical)</option>
              <option value="mode">Fill with mode (categorical)</option>
            </select>
          </div>

          {validationResult && (
            <div className={`card ${validationResult.valid ? 'bg-green' : 'bg-red'}`} style={{ marginBottom: 20 }}>
              {validationResult.valid ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CheckCircle size={18} color="#10b981" style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ fontWeight: 600, color: '#10b981', fontSize: 14, marginBottom: 2 }}>Valid</p>
                    <p style={{ fontSize: 12, color: '#6ee7b7' }}>{validationResult.message}</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertCircle size={18} color="#ef4444" style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ fontWeight: 600, color: '#ef4444', fontSize: 14, marginBottom: 2 }}>Invalid</p>
                    <p style={{ fontSize: 12, color: '#fca5a5' }}>{validationResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              {validating && <Loader size={14} className="spinner" />}
              Validate
            </button>
            <button
              onClick={handleSave}
              disabled={!validationResult?.valid || saving}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              {saving && <Loader size={14} className="spinner" />}
              Save & Continue <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Feature Selection */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>✨ Feature Columns</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Select which columns to use as features (predictors)
            </p>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {columns.filter(c => c !== mapping.target_column).map(col => (
                <label key={col} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mapping.feature_columns.includes(col)}
                    onChange={() => toggleFeature(col)}
                    style={{ marginRight: 10 }}
                  />
                  <span style={{ fontSize: 13 }}>{col}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>🏷️ Categorical Features</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Mark non-numeric columns (auto one-hot encoded)
            </p>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {mapping.feature_columns.map(col => (
                <label key={col} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mapping.categorical_columns.includes(col)}
                    onChange={() => toggleCategorical(col)}
                    style={{ marginRight: 10 }}
                  />
                  <span style={{ fontSize: 13 }}>{col}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>🔢 Numerical Features</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Mark numeric columns (auto standardized)
            </p>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {mapping.feature_columns.map(col => (
                <label key={col} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mapping.numerical_columns.includes(col)}
                    onChange={() => toggleNumerical(col)}
                    style={{ marginRight: 10 }}
                  />
                  <span style={{ fontSize: 13 }}>{col}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
