'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, Presentation, Eye } from 'lucide-react'

interface DocumentViewerProps {
  src: string
  fileName: string
  type: 'pdf' | 'ppt' | 'key'
  className?: string
}

export default function DocumentViewer({ src, fileName, type, className = '' }: DocumentViewerProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [src])

  const downloadFile = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = fileName
    link.click()
  }

  const openInNewTab = () => {
    window.open(src, '_blank')
  }

  // For PPT/Key files, we'll show an embedded iframe approach
  if (type === 'ppt' || type === 'key') {
    return (
      <div className={`w-full h-full bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
        <div className="h-full flex flex-col">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Presentation className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">
                {type === 'ppt' ? 'PowerPoint' : 'Keynote'}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={downloadFile}>
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-100">
            <div className="text-center">
              <Presentation className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {type === 'ppt' ? 'PowerPoint Presentation' : 'Keynote Presentation'}
              </h3>
              <p className="text-sm text-gray-600 mb-4 break-all">
                {fileName}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Click download to view the full presentation
              </p>
              <Button onClick={downloadFile} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Open Presentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // For PDF files, use iframe with browser's native PDF viewer
  return (
    <div className={`w-full h-full bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      <div className="h-full flex flex-col">
        {/* Header with controls */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-gray-700">PDF Document</span>
            <span className="text-xs text-gray-500">({fileName})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={openInNewTab}>
              <Eye className="h-3 w-3 mr-1" />
              View Full
            </Button>
            <Button size="sm" variant="outline" onClick={downloadFile}>
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Document content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading PDF...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Cannot Display PDF</h3>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={openInNewTab} variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View in New Tab
                  </Button>
                  <Button onClick={downloadFile}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <iframe
              src={`${src}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError('Failed to load PDF')
                setLoading(false)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
} 