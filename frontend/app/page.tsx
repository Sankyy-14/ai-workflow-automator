'use client';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dots, setDots] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated dots for loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, [loading]);

  // Blob canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { x: 0.2, y: 0.3, r: 0.35, color: '#6366f1', speedX: 0.0003, speedY: 0.0002, phase: 0 },
      { x: 0.8, y: 0.7, r: 0.3, color: '#8b5cf6', speedX: -0.0002, speedY: 0.0003, phase: 1 },
      { x: 0.5, y: 0.5, r: 0.25, color: '#06b6d4', speedX: 0.0004, speedY: -0.0003, phase: 2 },
      { x: 0.1, y: 0.8, r: 0.2, color: '#a855f7', speedX: 0.0002, speedY: -0.0004, phase: 3 },
      { x: 0.9, y: 0.2, r: 0.22, color: '#3b82f6', speedX: -0.0003, speedY: 0.0002, phase: 4 },
    ];

    const draw = () => {
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(blob => {
        const x = (blob.x + Math.sin(t * blob.speedX + blob.phase) * 0.15) * canvas.width;
        const y = (blob.y + Math.cos(t * blob.speedY + blob.phase) * 0.15) * canvas.height;
        const r = blob.r * Math.min(canvas.width, canvas.height);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, blob.color + '55');
        grad.addColorStop(1, blob.color + '00');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const runWorkflow = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('http://localhost:8000/api/execute/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: input }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Could not reach the backend. Is it running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  const priorityStyle = (p) => {
    if (p === 'high') return { dot: '#ef4444', label: 'HIGH', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
    if (p === 'medium') return { dot: '#f59e0b', label: 'MED', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
    return { dot: '#6b7280', label: 'LOW', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' };
  };

  const statusColor = (s) => {
    if (s === 'done') return '#22c55e';
    if (s === 'failed') return '#ef4444';
    if (s === 'running') return '#f59e0b';
    return '#6b7280';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #050508;
          color: #e2e8f0;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .canvas-bg {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          z-index: 0;
          filter: blur(80px);
          opacity: 0.6;
        }

        .noise {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          z-index: 1;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .main {
          position: relative;
          z-index: 2;
          max-width: 760px;
          margin: 0 auto;
          padding: 60px 24px 120px;
        }

        .header {
          text-align: center;
          margin-bottom: 56px;
          animation: fadeUp 0.8s ease both;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: #a5b4fc;
          letter-spacing: 0.08em;
          margin-bottom: 24px;
        }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #6366f1;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        h1 {
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #67e8f9 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 16px;
        }

        .subtitle {
          color: #64748b;
          font-size: 17px;
          font-weight: 400;
          letter-spacing: 0.01em;
        }

        .input-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          backdrop-filter: blur(20px);
          animation: fadeUp 0.8s 0.1s ease both;
          transition: border-color 0.3s;
        }

        .input-card:focus-within {
          border-color: rgba(99,102,241,0.4);
          box-shadow: 0 0 0 1px rgba(99,102,241,0.2), 0 20px 60px rgba(99,102,241,0.08);
        }

        textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          color: #f1f5f9;
          font-family: 'Syne', sans-serif;
          font-size: 17px;
          font-weight: 400;
          line-height: 1.6;
          caret-color: #6366f1;
        }

        textarea::placeholder { color: #334155; }

        .input-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #1e293b;
          letter-spacing: 0.05em;
        }

        .run-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 12px;
          padding: 12px 28px;
          color: white;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .run-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #818cf8, #a78bfa);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .run-btn:hover::before { opacity: 1; }
        .run-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(99,102,241,0.4); }
        .run-btn:active { transform: translateY(0); }
        .run-btn:disabled { background: #1e293b; color: #475569; cursor: not-allowed; box-shadow: none; transform: none; }
        .run-btn:disabled::before { display: none; }

        .btn-text { position: relative; z-index: 1; }

        .loading-bar {
          height: 2px;
          background: linear-gradient(90deg, #6366f1, #06b6d4, #8b5cf6, #6366f1);
          background-size: 200% 100%;
          animation: shimmer 1.5s linear infinite;
          border-radius: 100px;
          margin-bottom: 32px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .loading-text {
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #6366f1;
          letter-spacing: 0.1em;
          margin-bottom: 32px;
        }

        .error-card {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 16px;
          padding: 16px 20px;
          color: #fca5a5;
          font-size: 14px;
          margin-bottom: 24px;
          animation: fadeUp 0.4s ease both;
        }

        .result-section { animation: fadeUp 0.5s ease both; }

        .goal-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 16px;
          backdrop-filter: blur(20px);
        }

        .goal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: #334155;
          text-transform: uppercase;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          padding: 4px 12px;
          border-radius: 100px;
          border: 1px solid currentColor;
        }

        .goal-text {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }

        .workflow-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #1e293b;
          letter-spacing: 0.05em;
        }

        .step-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 12px;
          backdrop-filter: blur(20px);
          animation: fadeUp 0.5s ease both;
        }

        .step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .step-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .step-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #334155;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 6px;
          padding: 3px 8px;
          letter-spacing: 0.05em;
        }

        .action-name {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: #a5b4fc;
          letter-spacing: 0.02em;
        }

        .step-desc {
          font-size: 13px;
          color: #475569;
          margin-bottom: 16px;
          padding-left: 2px;
        }

        .result-box {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 14px;
          padding: 16px;
        }

        .fetch-result {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #22c55e;
          letter-spacing: 0.05em;
        }

        .email-list { display: flex; flex-direction: column; gap: 10px; }

        .email-item {
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid;
          transition: transform 0.2s;
        }

        .email-item:hover { transform: translateX(4px); }

        .email-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
        }

        .email-subject {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          line-height: 1.4;
          flex: 1;
        }

        .priority-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          padding: 3px 8px;
          border-radius: 100px;
          border: 1px solid;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .email-summary {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .email-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .email-from {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #334155;
          letter-spacing: 0.03em;
        }

        .reply-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #67e8f9;
          letter-spacing: 0.05em;
        }

        .step-error {
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.15);
          border-radius: 12px;
          padding: 12px 16px;
          color: #fca5a5;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1.5;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <canvas ref={canvasRef} className="canvas-bg" />
      <div className="noise" />

      <main className="main">
        <div className="header">
          <div className="badge">
            <div className="badge-dot" />
            AI WORKFLOW AUTOMATOR
          </div>
          <h1>Type it.<br />Watch it happen.</h1>
          <p className="subtitle">Natural language → real actions. No code required.</p>
        </div>

        <div className="input-card">
          <textarea
            rows={3}
            placeholder="e.g. Summarize my 5 most recent unread emails..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                runWorkflow();
              }
            }}
          />
          <div className="input-footer">
            <span className="hint">↵ ENTER TO RUN</span>
            <button className="run-btn" onClick={runWorkflow} disabled={loading}>
              <span className="btn-text">{loading ? `Running${dots}` : 'Run →'}</span>
            </button>
          </div>
        </div>

        {loading && (
          <>
            <div className="loading-bar" />
            <div className="loading-text">EXECUTING WORKFLOW{dots}</div>
          </>
        )}

        {error && <div className="error-card">⚠ {error}</div>}

        {result && (
          <div className="result-section">
            <div className="goal-card">
              <div className="goal-header">
                <span className="label">Goal</span>
                <span className="status-badge" style={{ color: statusColor(result.status) }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(result.status), display: 'inline-block' }} />
                  {result.status.toUpperCase()}
                </span>
              </div>
              <div className="goal-text">{result.goal}</div>
              <div className="workflow-id">wf_{result.workflow_id}</div>
            </div>

            {result.steps.map((step, i) => (
              <div className="step-card" key={step.id} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="step-header">
                  <div className="step-left">
                    <span className="step-id">{step.id}</span>
                    <span className="action-name">{step.action}</span>
                  </div>
                  <span className="status-badge" style={{ color: statusColor(step.status) }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(step.status), display: 'inline-block' }} />
                    {step.status.toUpperCase()}
                  </span>
                </div>
                <div className="step-desc">{step.description}</div>

                {step.result && (
                  <div className="result-box">
                    {step.result.summaries && (
                      <div className="email-list">
                        {step.result.summaries.map((s, idx) => {
                          const ps = priorityStyle(s.priority);
                          return (
                            <div key={idx} className="email-item" style={{ background: ps.bg, borderColor: ps.border }}>
                              <div className="email-top">
                                <div className="email-subject">{s.subject}</div>
                                <span className="priority-tag" style={{ color: ps.dot, borderColor: ps.border }}>
                                  {ps.label}
                                </span>
                              </div>
                              <div className="email-summary">{s.summary}</div>
                              <div className="email-footer">
                                <span className="email-from">{s.from?.split('<')[0]?.trim()}</span>
                                {s.needs_reply && <span className="reply-badge">↩ REPLY NEEDED</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {step.result.emails && !step.result.summaries && (
                      <div className="fetch-result">✓ {step.result.count} emails fetched</div>
                    )}

                    {!step.result.summaries && !step.result.emails && (
                      <pre style={{ color: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono', overflow: 'auto', lineHeight: 1.6 }}>
                        {JSON.stringify(step.result, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {step.error && <div className="step-error">{step.error}</div>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
