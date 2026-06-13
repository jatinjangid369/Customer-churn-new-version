import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader, Play, Settings } from 'lucide-react'
import api from '../api/axios'

const MODELS = {
  rf: {
    name: 'Random Forest',
    icon: '🌲',
    desc: 'Ensemble method with multiple decision trees',
    speed: 'Medium',
    accuracy: 'Very High',
    defaults: { n_estimators: 100, max_depth: 15 }
  },
  lr: {
    name: 'Logistic Regression',
    icon: '📈',
    desc: 'Interpretable linear classifier',
    speed: 'Fast',
    accuracy: 'High',
    defaults: { max_iter: 1000 }
  },
  xgb: {
    name: 'XGBoost',
    icon: '⚡',
    desc: 'Gradient boosting with advanced features',
    speed: 'Slow',
    accuracy: 'Very High',
    defaults: { n_estimators: 100, learning_rate: 0.1, subsample: 0.8 }
  },
  lgb: {
    name: 'LightGBM',
    icon: '💡',
    desc: 'Fast gradient boosting for large datasets',
    speed: 'Very Fast',
    accuracy: 'Very High',
    defaults: { n_estimators: 100, num_leaves: 31 }
  }
}

function ModelCard({ code, selected, onClick }) {
  const model = MODELS[code]
  return (
    <div
      onClick={onClick}
      style={{
        border: selected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
        background: selected ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{model.icon}</div>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{model.name}</h4>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{model.desc}</p>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>⚡ {model.speed}</span>
        <span>🎯 {model.accuracy}</span>
      </div>
      {selected && (
        <div style={{
          marginTop: 12,
          padding: '6px 10px',
          background: '#6366f1',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          width: 'fit-content'
        }}>
          ✓ Selected
        </div>
      )}
    </div>
  )
}

export default function TrainingPage() {
  const { featureMappingId } = useParams()
  const navigate = useNavigate()

  const [featureMapping, setFeatureMapping] = useState(null)
  const [selectedModel, setSelectedModel] = useState('rf')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [hyperparameters, setHyperparameters] = useState(MODELS.rf.defaults)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/feature-mappings/${featureMappingId}/`)
        setFeatureMapping(res.data)
      } catch (err) {
        setError('Failed to load feature mapping')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [featureMappingId])

  const handleModelSelect = (code) => {
    setSelectedModel(code)
    setHyperparameters(MODELS[code].defaults)
  }

  const handleHyperparameterChange = (key, value) => {
    setHyperparameters(h => ({
      ...h,
      [key]: isNaN(value) ? value : parseFloat(value)
    }))
  }

  const handleStartTraining = async () => {
    setTraining(true)
    try {
      // First create ModelConfig
      const configRes = await api.post('/model-configs/', {
        name: `${MODELS[selectedModel].name} - ${new Date().toLocaleString()}`,
        model_type: selectedModel,
        hyperparameters: hyperparameters
      })

      // Then create TrainingJob
      const jobRes = await api.post('/training-jobs/', {
        dataset_id: featureMapping.dataset,
        feature_mapping_id: featureMappingId,
        model_config_id: configRes.data.id
      })

      setTimeout(() => navigate(`/training-progress/${jobRes.data.id}`), 1000)
    } catch (err) {
      setError('Failed to start training')
      setTraining(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader size={32} className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ Train Model</h1>
        <p className="page-subtitle">{featureMapping?.dataset_name || 'Dataset'} • {featureMapping?.feature_columns?.length || 0} features</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Model Selection */}
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Select Algorithm</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>
            {Object.entries(MODELS).map(([code, model]) => (
              <ModelCard
                key={code}
                code={code}
                selected={selectedModel === code}
                onClick={() => handleModelSelect(code)}
              />
            ))}
          </div>

          {/* Hyperparameters */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                marginBottom: showAdvanced ? 16 : 0
              }}
            >
              <Settings size={16} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Advanced Hyperparameters</span>
            </div>

            {showAdvanced && (
              <div>
                {Object.entries(hyperparameters).map(([key, value]) => (
                  <div key={key} className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, marginBottom: 4 }}>
                      {key.replace(/_/g, ' ')}
                    </label>
                    <input
                      type={typeof value === 'number' ? 'number' : 'text'}
                      value={value}
                      onChange={(e) => handleHyperparameterChange(key, e.target.value)}
                      className="input"
                      step={typeof value === 'number' ? (value < 1 ? 0.01 : 1) : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              color: '#fca5a5',
              fontSize: 12
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleStartTraining}
            disabled={training}
            className="btn-primary"
            style={{ width: '100%', fontSize: 16 }}
          >
            {training && <Loader size={16} className="spinner" />}
            {training ? 'Starting Training...' : 'Start Training'}
            {!training && <ArrowRight size={16} />}
          </button>
        </div>

        {/* Info Panel */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 12, fontSize: 13, fontWeight: 700 }}>📊 Dataset Info</h4>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <p><strong>Features:</strong> {featureMapping?.feature_columns?.length || 0}</p>
              <p><strong>Categorical:</strong> {featureMapping?.categorical_columns?.length || 0}</p>
              <p><strong>Numerical:</strong> {featureMapping?.numerical_columns?.length || 0}</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 12, fontSize: 13, fontWeight: 700 }}>⏱️ Expected Time</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {selectedModel === 'lr' && '1-2 minutes'}
              {selectedModel === 'rf' && '2-5 minutes'}
              {selectedModel === 'lgb' && '2-3 minutes'}
              {selectedModel === 'xgb' && '5-10 minutes'}
            </p>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 12, fontSize: 13, fontWeight: 700 }}>💡 Model Recommendation</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Start with <strong>Random Forest</strong> or <strong>LightGBM</strong> for best accuracy.
              Try <strong>Logistic Regression</strong> if you need interpretability.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
