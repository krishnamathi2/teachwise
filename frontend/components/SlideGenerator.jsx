// SlideGenerator component for creating and previewing slides
import { useState } from 'react'

export default function SlideGenerator({ lessonContent, onClose }) {
  const [slides, setSlides] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportType, setExportType] = useState('')

  const generateSlides = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/generate-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonContent })
      })
      
      const data = await response.json()
      
      if (data.error) {
        setError(data.error + (data.detail ? ': ' + data.detail : ''))
      } else {
        setSlides(data.slides || [])
      }
    } catch (err) {
      setError('Failed to generate slides: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const downloadAsPDF = async () => {
    if (!slides.length) return

    setExportLoading(true)
    setExportType('PDF')

    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      slides.forEach((slide, index) => {
        if (index > 0) pdf.addPage()
        
        // Add title
        pdf.setFontSize(24)
        pdf.setFont(undefined, 'bold')
        pdf.text(slide.title, pageWidth / 2, 30, { align: 'center' })
        
        // Add content bullets
        pdf.setFontSize(14)
        pdf.setFont(undefined, 'normal')
        let yPosition = 50
        
        slide.content?.forEach((bullet) => {
          const cleanBullet = bullet.replace(/^[•·-]\s*/, '• ')
          const lines = pdf.splitTextToSize(cleanBullet, pageWidth - 40)
          
          lines.forEach(line => {
            if (yPosition > pageHeight - 30) {
              pdf.addPage()
              yPosition = 30
            }
            pdf.text(line, 20, yPosition)
            yPosition += 8
          })
          yPosition += 3
        })
        
        // Add speaker notes at bottom
        if (slide.speakerNotes) {
          pdf.setFontSize(10)
          pdf.setFont(undefined, 'italic')
          yPosition = pageHeight - 25
          
          const notesLines = pdf.splitTextToSize(`Notes: ${slide.speakerNotes}`, pageWidth - 40)
          notesLines.forEach(line => {
            pdf.text(line, 20, yPosition)
            yPosition += 5
          })
        }
      })
      
      pdf.save('lesson-slides.pdf')
    } catch (error) {
      console.error('PDF export error:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setExportLoading(false)
      setExportType('')
    }
  }

  const downloadAsPPTX = async () => {
    if (!slides.length) return

    setExportLoading(true)
    setExportType('PPTX')

    try {
      // Dynamic import to avoid SSR issues
      const PptxGenJS = (await import('pptxgenjs')).default
      const pptx = new PptxGenJS()
      pptx.author = 'TeachWise.ai'
      pptx.company = 'TeachWise'
      pptx.revision = '1'
      pptx.subject = 'Educational Lesson Slides'
      pptx.title = slides[0]?.title || 'Lesson Presentation'

      slides.forEach((slide) => {
        const pptxSlide = pptx.addSlide()
        
        // Add title
        pptxSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 28,
          bold: true,
          color: '2F4F4F',
          align: 'center'
        })
        
        // Add content bullets
        const bulletText = slide.content?.map(bullet => 
          bullet.replace(/^[•·-]\s*/, '• ')
        ).join('\n') || ''
        
        if (bulletText) {
          pptxSlide.addText(bulletText, {
            x: 1,
            y: 2,
            w: 8,
            h: 4,
            fontSize: 18,
            color: '333333',
            bullet: true,
            lineSpacing: 32
          })
        }
        
        // Add speaker notes
        if (slide.speakerNotes) {
          pptxSlide.addNotes(slide.speakerNotes)
        }
      })
      
      await pptx.writeFile({ fileName: 'lesson-slides.pptx' })
    } catch (error) {
      console.error('PPTX export error:', error)
      alert('Failed to export PowerPoint. Please try again.')
    } finally {
      setExportLoading(false)
      setExportType('')
    }
  }

  const downloadSlidesJson = () => {
    if (!slides.length) return
    try {
      const content = JSON.stringify({ slides }, null, 2)
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lesson-slides-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to download slides JSON', e)
    }
  }

  return (
    <div className="slide-generator-modal">
      <div className="slide-generator-container">
        <div className="slide-generator-header">
          <h2>🖼️ Slide Generator</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        {!slides.length && !loading && (
          <div className="slide-generator-intro">
            <p>Convert your lesson plan into beautiful PowerPoint-style slides!</p>
            <button onClick={generateSlides} className="generate-slides-button">
              ✨ Generate Slides
            </button>
          </div>
        )}

        {loading && (
          <div className="slide-generator-loading">
            <div className="loading-spinner"></div>
            <p>Creating your slides...</p>
          </div>
        )}

        {error && (
          <div className="slide-generator-error">
            <p>❌ {error}</p>
            <button onClick={generateSlides} className="retry-button">
              🔄 Try Again
            </button>
          </div>
        )}

        {slides.length > 0 && (
          <>
            <div className="slide-controls">
              <button 
                onClick={prevSlide} 
                disabled={currentSlide === 0}
                className="nav-button"
              >
                ← Previous
              </button>
              
              <span className="slide-counter">
                Slide {currentSlide + 1} of {slides.length}
              </span>
              
              <button 
                onClick={nextSlide} 
                disabled={currentSlide === slides.length - 1}
                className="nav-button"
              >
                Next →
              </button>
            </div>

            <div className="slide-preview">
              <div className="slide-content">
                <h1 className="slide-title">{slides[currentSlide]?.title}</h1>
                <div className="slide-bullets">
                  {slides[currentSlide]?.content?.map((bullet, index) => (
                    <div key={index} className="bullet-point">{bullet}</div>
                  ))}
                </div>
              </div>
            </div>

            {slides[currentSlide]?.speakerNotes && (
              <div className="speaker-notes">
                <h4>📝 Speaker Notes:</h4>
                <p>{slides[currentSlide].speakerNotes}</p>
              </div>
            )}

            <div className="export-info">
              <p>💡 <strong>Download Options:</strong></p>
              <ul>
                <li><strong>PDF:</strong> Perfect for handouts and printing</li>
                <li><strong>PowerPoint:</strong> Editable slides for classroom use</li>
              </ul>
            </div>

            <div className="download-options">
              <button
                onClick={downloadSlidesJson}
                className="download-button json"
                disabled={exportLoading}
              >
                📥 Download JSON
              </button>
              <button 
                onClick={downloadAsPDF} 
                className="download-button pdf"
                disabled={exportLoading}
              >
                {exportLoading && exportType === 'PDF' ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>📄 Download as PDF</>
                )}
              </button>
              <button 
                onClick={downloadAsPPTX} 
                className="download-button pptx"
                disabled={exportLoading}
              >
                {exportLoading && exportType === 'PPTX' ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Generating PPTX...
                  </>
                ) : (
                  <>📊 Download as PPTX</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}