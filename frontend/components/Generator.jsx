// Enhanced Generator component with better UX

import { useRef, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SlideGenerator from './SlideGenerator'
import { createClient } from '@supabase/supabase-js'

const formatGradeLabel = (grade) => (grade === 'K' ? 'Kindergarten' : `Grade ${grade}`)

const LoadingSkeleton = () => (
  <div className="result-skeleton">
    <div className="skeleton-chip"></div>
    <div className="skeleton-line skeleton-line--wide"></div>
    <div className="skeleton-line skeleton-line--wide"></div>
    <div className="skeleton-line"></div>
    <div className="skeleton-line"></div>
    <div className="skeleton-line skeleton-line--short"></div>
  </div>
)

export default function Generator() {
  const [type, setType] = useState('lesson')
  const [grade, setGrade] = useState('7')
  const [subject, setSubject] = useState('Science')
  const [topic, setTopic] = useState('Photosynthesis')
  const [weeks, setWeeks] = useState('6')
  const [minutes, setMinutes] = useState('45')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showSlideGenerator, setShowSlideGenerator] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [hideAnswers, setHideAnswers] = useState(false)
  
  // Get current user for credits system
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()
  }, [])
  
  const resultCardRef = useRef(null)

  // Helper function to format the response text
  const formatResponse = (text) => {
    if (!text) return text
    
    // For quiz content, ensure proper spacing between questions
    if (type === 'quiz') {
      return text
        .replace(/Question (\d+):/g, '\n\nQuestion $1:')
        .replace(/\*\*Answer:\*\*/g, '\n**Answer:**')
        .replace(/\*\*Explanation:\*\*/g, '\n**Explanation:**')
        .replace(/^\n+/, '') // Remove leading newlines
        .trim()
    }
    
    // For presentation content, ensure proper spacing between slides
    if (type === 'presentation') {
      return text
        .replace(/SLIDE (\d+):/g, '\n\n**SLIDE $1:**')
        .replace(/Speaker Notes?:/gi, '\n**Speaker Notes:**')
        .replace(/^\n+/, '') // Remove leading newlines
        .trim()
    }
    
    // For lesson plans, ensure proper spacing between sections
    return text
      .replace(/🎯/g, '\n\n🎯')
      .replace(/📚/g, '\n\n📚')
      .replace(/🔥/g, '\n\n🔥')
      .replace(/📖/g, '\n\n📖')
      .replace(/✅/g, '\n\n✅')
      .replace(/🏠/g, '\n\n🏠')
      .replace(/💡/g, '\n\n💡')
      .replace(/^\n+/, '') // Remove leading newlines
      .trim()
  }

  const doGenerate = async () => {
    setLoading(true)
    try {
      // Get user email from localStorage
      const savedUser = localStorage.getItem('teachwise_user');
      const userEmail = savedUser ? JSON.parse(savedUser).email : null;
      
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          grade, 
          subject, 
          topic, 
          minutes, 
          hideAnswers, 
          weeks,
          email: userEmail // Pass email for credits checking
        })
      })
      const data = await r.json()
      if (data.error) {
        // Handle credits-specific errors
        if (data.error === 'No credits remaining' || data.error === 'Failed to deduct credit') {
          setResult(`❌ No Credits Remaining\n\nYou need 4 credits for this operation but you have ${data.credits || 0} credits left.\n\n💡 **Add Credits to Continue using AI tools!**`)
        } else {
          setResult('❌ ' + (data.detail || data.error))
        }
      } else {
        const formattedResult = formatResponse(data.result)
        setResult(formattedResult)
        setTimeout(() => {
          if (resultCardRef.current) {
            // play success animation
            resultCardRef.current.classList.add('success-animation')
            setTimeout(() => resultCardRef.current?.classList.remove('success-animation'), 600)
            // scroll result into view and ensure the container's inner scroll is at top
            try {
              resultCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
              // if the result container is scrollable, reset its scrollTop so user sees the start
              resultCardRef.current.scrollTop = 0
            } catch (e) {
              // ignore if not supported
            }
          }
        }, 120)
      }
    } catch (err) {
      setResult('🚫 Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setResult('')
    await doGenerate()
  }

  const handleRetry = async () => {
    await doGenerate()
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadResult = () => {
    try {
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teachwise_generated_${type}_${Date.now()}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download failed', e)
    }
  }

  const [showFullModal, setShowFullModal] = useState(false)
  const openFullModal = () => setShowFullModal(true)
  const closeFullModal = () => setShowFullModal(false)
  const fullModalRef = useRef(null)
  const modalCloseRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  // When modal opens, trap focus and allow Esc to close
  useEffect(() => {
    if (!showFullModal) return
    previouslyFocusedRef.current = document.activeElement
    // focus the close button when modal opens
    setTimeout(() => modalCloseRef.current?.focus(), 0)

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeFullModal()
        return
      }
      if (e.key === 'Tab') {
        // focus trap: keep focus inside modal
        const focusable = fullModalRef.current.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // restore focus
      try { previouslyFocusedRef.current?.focus() } catch (e) {}
    }
  }, [showFullModal])

  const isError = result.startsWith('❌') || result.startsWith('🚫')
  const hasResult = result.trim().length > 0
  const isLessonPlan = type === 'lesson' && hasResult && !isError
  const isPresentationContent = (type === 'presentation' || type === 'lesson') && hasResult && !isError
  const gradeLabel = formatGradeLabel(grade)

  const summaryChips = [
    { label: 'Grade', value: gradeLabel },
    { label: 'Subject', value: subject }
  ]

  if (type === 'lesson') {
    summaryChips.push({ label: 'Duration', value: `${minutes} mins` })
  }

  const statusLabel = loading
    ? 'Crafting your content...'
    : isError
    ? 'Needs a quick fix'
    : hasResult
    ? 'Ready to review'
    : 'Awaiting your brief'

  const statusClassName = loading
    ? 'status-chip status-chip--loading'
    : isError
    ? 'status-chip status-chip--error'
    : hasResult
    ? 'status-chip status-chip--success'
    : 'status-chip'

  const markdownComponents = {
    a: ({ node, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer" />
    )
  }

  return (
    <>
      <div className="workspace">
        <section className="panel form-panel">
          <header className="panel-header">
            <div>
              <h2>Content Builder</h2>
              <p>Describe the session and review polished output instantly.</p>
            </div>
            <span className="panel-badge">{type === 'lesson' ? 'Lesson Plan' : type === 'quiz' ? 'Quiz' : type === 'course' ? 'Course Content' : 'Presentation'}</span>
          </header>

          <form onSubmit={handleGenerate} className="form-grid">
            <div className="form-field">
              <label>Content Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="form-select"
              >
                <option value="lesson">📚 Lesson Plan</option>
                <option value="quiz">📝 Quiz & Assessment</option>
                <option value="course">🧭 Course Content</option>
                <option value="presentation">🎯 Presentation Slides</option>
              </select>
            </div>

            <div className="form-two-column">
              <div className="form-field">
                <label>Grade Level</label>
                <select 
                  value={grade} 
                  onChange={e => setGrade(e.target.value)}
                >
                  <option value="K">Kindergarten</option>
                  <option value="1">Grade 1</option>
                  <option value="2">Grade 2</option>
                  <option value="3">Grade 3</option>
                  <option value="4">Grade 4</option>
                  <option value="5">Grade 5</option>
                  <option value="6">Grade 6</option>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>

              <div className="form-field">
                <label>Subject</label>
                <select 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)}
                >
                  <option value="Science">🔬 Science</option>
                  <option value="Mathematics">🧮 Mathematics</option>
                  <option value="English">📖 English</option>
                  <option value="History">🏛️ History</option>
                  <option value="Geography">🌍 Geography</option>
                  <option value="Art">🎨 Art</option>
                  <option value="Music">🎵 Music</option>
                  <option value="Physical Education">⚽ Physical Education</option>
                  <option value="Computer Science">💻 Computer Science</option>
                  <option value="Foreign Language">🌐 Foreign Language</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Topic</label>
              <input 
                type="text"
                value={topic} 
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter the specific topic or concept..."
                required
              />
            </div>

            {type === 'lesson' && (
              <div className="form-field">
                <label>Duration (minutes)</label>
                <select 
                  value={minutes} 
                  onChange={e => setMinutes(e.target.value)}
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>
            )}

            {type === 'course' && (
              <div className="form-field">
                <label>Course length (weeks)</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={weeks}
                  onChange={e => setWeeks(e.target.value)}
                />
              </div>
            )}


            <div className="form-field">
              <label>
                <input type="checkbox" checked={hideAnswers} onChange={e => setHideAnswers(e.target.checked)} />{' '}
                Hide answers (for student version)
              </label>
            </div>

            

            <button 
              type="submit" 
              disabled={loading || !topic.trim()}
              className="generate-button"
            >
              {loading && <div className="loading-spinner"></div>}
              {loading ? 'Generating...' : `✨ Generate`}
            </button>
          </form>

          <div className="helper-card">
            <h4>Tips for sharper output</h4>
            <ul>
              <li>Reference prior knowledge or recent units to anchor learning.</li>
              <li>Add skill focus like "critical thinking" or "collaborative" tasks.</li>
              <li>Specify assessment style to tailor quizzes (multiple choice, rubric, etc.).</li>
            </ul>
          </div>
        </section>

        <section className="panel result-panel">
          <div className="result-panel-header">
            <span className={statusClassName}>{statusLabel}</span>
            <div className="summary-chips">
              {summaryChips.map(({ label, value }) => (
                <span className="summary-chip" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </span>
              ))}
            </div>
          </div>

          {loading && <LoadingSkeleton />}

          {!loading && hasResult && (
            <div
              className={`result-container ${isError ? 'result-container--error' : 'result-container--success'}`}
              ref={resultCardRef}
            >
              <div className="result-header">
                <h3>
            {isError ? '⚠️ Something needs attention' : type === 'lesson' ? '📚 Lesson plan ready to use' : type === 'quiz' ? '📝 Quiz outline ready' : type === 'course' ? '🧭 Course content ready' : type === 'presentation' ? '🎯 Presentation slides ready' : '📄 Content ready'}
                </h3>
                <div className="result-actions">
                  {!isError && (
                    <button 
                      onClick={copyToClipboard}
                      className="copy-button"
                      title="Copy to clipboard"
                    >
                      📋 Copy
                    </button>
                  )}
                  {!isError && (
                    <button onClick={openFullModal} className="copy-button" title="View full">
                      🔍 View full
                    </button>
                  )}
                  {!isError && (
                    <button onClick={downloadResult} className="slide-button" title="Download as .txt">
                      ⬇ Download
                    </button>
                  )}
                  {isError && (
                    <button 
                      onClick={handleRetry}
                      className="slide-button"
                      title="Retry"
                    >
                      🔁 Retry
                    </button>
                  )}
                  {isPresentationContent && (
                    <button 
                      onClick={() => setShowSlideGenerator(true)}
                      className="slide-button"
                      title="Convert to slides"
                    >
                      🖼️ Export as PDF/PPT
                    </button>
                  )}
                </div>
              </div>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className={`result-content ${isError ? 'error' : 'success'}`}
                components={markdownComponents}
                skipHtml
              >
                {result}
              </ReactMarkdown>
            </div>
          )}

          {!loading && !hasResult && (
            <div className="result-empty">
              <h3>Preview will appear here</h3>
              <p>Fine-tune the inputs on the left and generate to see AI-curated plans instantly.</p>
              <ul>
                <li>Switch between lesson plans and quizzes at any time.</li>
                <li>Use the duration field to align pacing with your schedule.</li>
                <li>Export polished slides once a lesson plan is created.</li>
              </ul>
            </div>
          )}

          {!loading && hasResult && isError && (
            <div className="result-empty result-empty--overlay">
              <p>Review the message above and adjust your prompt — then try again.</p>
            </div>
          )}
        </section>
      </div>

      {showToast && (
        <div className="toast">
          ✅ Copied to clipboard!
        </div>
      )}

      {showFullModal && (
        <div className="full-modal" role="dialog" aria-modal="true">
          <div className="full-modal-content" ref={fullModalRef}>
            <div className="full-modal-header">
              <h4>Full generated content</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button ref={modalCloseRef} className="modal-close" onClick={closeFullModal} aria-label="Close modal">✖</button>
              </div>
            </div>
            <pre className="full-modal-pre">{result}</pre>
            <div className="full-modal-actions">
              <button onClick={copyToClipboard} className="copy-button">📋 Copy</button>
              <button onClick={() => {
                // download as .txt
                const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `teachwise_generated_${type}_${Date.now()}.txt`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
              }} className="slide-button">⬇ Download .txt</button>
              <button onClick={closeFullModal} className="slide-button">Close</button>
            </div>
          </div>
        </div>
      )}

      {showSlideGenerator && (
        <SlideGenerator 
          lessonContent={result}
          onClose={() => setShowSlideGenerator(false)}
        />
      )}
    </>
  )
}