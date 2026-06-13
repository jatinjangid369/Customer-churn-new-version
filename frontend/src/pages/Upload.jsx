import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import api from '../api/axios'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [datasetName, setDatasetName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'
  }

  const handleDragLeave = (e) => {
    e.currentTarget.style.background = 'transparent'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.style.background = 'transparent'
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const handleFileSelect = (selectedFile) => {
    setError(null)
    setSuccess(null)

    if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(selectedFile.type)) {
      setError('Only CSV and Excel files are supported')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Max size: 50MB`)
      return
    }

    setFile(selectedFile)
    setDatasetName(selectedFile.name.replace(/\.[^.]+$/, ''))

    // Show preview
    if (selectedFile.type === 'text/csv') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const lines = e.target.result.split('\n').slice(0, 6)
        setPreview(lines.join('\n'))
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file || !datasetName) {
      setError('Please select a file and enter a name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', datasetName)

      const res = await api.post('/datasets/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess(`Dataset "${res.data.name}" uploaded successfully! (${res.data.rows_count} rows)`)
      setFile(null)
      setDatasetName('')
      setPreview(null)
      fileInputRef.current.value = ''

      setTimeout(() => {
        window.location.href = `/feature-mapping/${res.data.id}`
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Check backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📤 Upload Dataset</h1>
        <p className="page-subtitle">CSV or Excel file with customer data</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Upload Section */}
        <div className="card">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: '2px dashed rgba(99, 102, 241, 0.5)',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: 20,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} style={{ margin: '0 auto 12px', color: '#6366f1', opacity: 0.7 }} />
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Drag file here or click to browse
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              CSV or Excel • Max 50MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>

          {file && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>✓ File Selected</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              </div>
              <button
                onClick={() => { setFile(null); setPreview(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="#ef4444" />
              </button>
            </div>
          )}

          <div className="form-group">
            <label>Dataset Name</label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g., Q1 Customers"
              className="input"
              disabled={!file}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              color: '#fca5a5',
              fontSize: 12
            }}>
              <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              color: '#6ee7b7',
              fontSize: 12
            }}>
              <CheckCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              {success}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: file && !loading ? '#6366f1' : '#4b5563',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: file && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading && <Loader size={16} className="spinner" />}
            {loading ? 'Uploading...' : 'Upload & Continue'}
          </button>
        </div>

        {/* Info Section */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>✅ File Requirements</h3>
            <ul style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <li>✓ CSV or Excel format</li>
              <li>✓ First row = column headers</li>
              <li>✓ At least 50 rows</li>
              <li>✓ Max 50MB size</li>
              <li>✓ One column must be customer ID</li>
              <li>✓ One column is target (churned/not churned)</li>
            </ul>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>📊 What Happens Next</h3>
            <ol style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Data quality validation</li>
              <li>Map columns (ID, target, features)</li>
              <li>Select ML algorithm</li>
              <li>Configure hyperparameters</li>
              <li>Train model automatically</li>
              <li>Get predictions & insights</li>
            </ol>
          </div>

          {preview && (
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>👀 File Preview</h3>
              <pre style={{
                background: 'rgba(0,0,0,0.2)',
                padding: 12,
                borderRadius: 6,
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 200,
                color: '#94a3b8',
                fontFamily: 'Courier'
              }}>
                {preview}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
