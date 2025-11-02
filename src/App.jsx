import React, { useState, useRef, useCallback } from 'react'
import { CloudUploadOutlined, DownloadOutlined, CheckCircleOutlined, CloseOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { Button, Upload as AntUpload, Space, Card } from 'antd'
import './App.css'

const ASSET_TYPES = {
  'screenshots': {
    label: 'Screenshots',
    sizes: [
      { label: '1280x800', value: '1280x800', width: 1280, height: 800 },
      { label: '640x400', value: '640x400', width: 640, height: 400 }
    ],
    aspect: 1280 / 800
  },
  'small-promo': {
    label: 'Small Promo Tile',
    sizes: [
      { label: '440x280', value: '440x280', width: 440, height: 280 }
    ],
    aspect: 440 / 280
  },
  'marquee-promo': {
    label: 'Marquee Promo Tile',
    sizes: [
      { label: '1400x560', value: '1400x560', width: 1400, height: 560 }
    ],
    aspect: 1400 / 560
  }
}

function App() {
  const [selectedAssetType, setSelectedAssetType] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [uploadedImages, setUploadedImages] = useState([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showResizeView, setShowResizeView] = useState(false)
  const [resizedImages, setResizedImages] = useState({})
  const [isResizing, setIsResizing] = useState(false)
  
  const canvasRefs = useRef({})

  const currentImage = uploadedImages[activeImageIndex]
  const targetSize = selectedSize ? ASSET_TYPES[selectedAssetType]?.sizes.find(s => s.value === selectedSize) : null

  const handleFileSelect = async (files) => {
    const fileArray = Array.isArray(files) ? files : [files]
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    
    const validFiles = fileArray.filter(file => 
      allowedTypes.includes(file.type?.toLowerCase()) || 
      /\.(jpg|jpeg|png)$/i.test(file.name)
    )
    
    if (validFiles.length === 0) return
    
    const newImages = validFiles.map(file => {
      return {
        id: Date.now() + Math.random(),
        file: file,
        src: null,
        processed: null,
        cropData: null,
        originalWidth: null,
        originalHeight: null
      }
    })

    const imagesWithSrc = await Promise.all(
      newImages.map(async (img) => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const imgElement = new window.Image()
            imgElement.onload = () => {
              resolve({ 
                ...img, 
                src: e.target.result,
                originalWidth: imgElement.naturalWidth || imgElement.width,
                originalHeight: imgElement.naturalHeight || imgElement.height
              })
            }
            imgElement.onerror = () => {
              resolve({ ...img, src: e.target.result })
            }
            imgElement.src = e.target.result
          }
          reader.readAsDataURL(img.file)
        })
      })
    )

    setUploadedImages(prev => [...prev, ...imagesWithSrc])
    setActiveImageIndex(prev => prev + imagesWithSrc.length)
    // Exit resize view when new images are uploaded
    if (showResizeView) {
      setShowResizeView(false)
    }
  }

  const onSelectFile = (options) => {
    const { file } = options
    if (file) {
      const fileObj = file.originFileObj || file
      if (fileObj) {
        handleFileSelect([fileObj])
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    const files = Array.from(e.dataTransfer.files).filter(file => 
      allowedTypes.includes(file.type.toLowerCase()) || 
      /\.(jpg|jpeg|png)$/i.test(file.name)
    )
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const removeImage = (index) => {
    // Clean up blob URL if exists
    if (resizedImages[index]) {
      URL.revokeObjectURL(resizedImages[index])
    }
    setResizedImages(prev => {
      const updated = { ...prev }
      delete updated[index]
      // Reindex remaining images
      const reindexed = {}
      Object.keys(updated).forEach(key => {
        const keyNum = parseInt(key)
        if (keyNum > index) {
          reindexed[keyNum - 1] = updated[key]
        } else if (keyNum < index) {
          reindexed[keyNum] = updated[key]
        }
      })
      return reindexed
    })
    setUploadedImages(prev => {
      const updated = prev.filter((_, i) => i !== index)
      if (activeImageIndex >= updated.length && updated.length > 0) {
        setActiveImageIndex(updated.length - 1)
      } else if (updated.length === 0) {
        setActiveImageIndex(0)
        setShowResizeView(false)
      }
      return updated
    })
    if (canvasRefs.current[currentImage?.id]) {
      delete canvasRefs.current[currentImage?.id]
    }
  }

  const resizeImage = async (imageIndex) => {
    const image = uploadedImages[imageIndex]
    if (!image || !targetSize || !image.src) return

    // Always resize from original source image
    const sourceImg = new window.Image()
    sourceImg.src = image.src
    await new Promise((resolve, reject) => {
      sourceImg.onload = resolve
      sourceImg.onerror = reject
    })

    const canvas = document.createElement('canvas')
    canvas.width = targetSize.width
    canvas.height = targetSize.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(sourceImg, 0, 0, targetSize.width, targetSize.height)

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      // Store resized image URL for comparison view
      setResizedImages(prev => ({
        ...prev,
        [imageIndex]: url
      }))
    }, 'image/png')
  }

  const resizeAllImages = async () => {
    if (!targetSize || uploadedImages.length === 0 || isResizing) return
    
    setIsResizing(true)
    try {
      for (let i = 0; i < uploadedImages.length; i++) {
        await resizeImage(i)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      setShowResizeView(true)
    } finally {
      setIsResizing(false)
    }
  }

  const downloadResizedImage = async (imageIndex) => {
    const image = uploadedImages[imageIndex]
    if (!image || !targetSize || !image.src) return

    return new Promise(async (resolve) => {
      let urlToRevoke = null

      try {
        // Use the resized image if available, otherwise create it
        if (resizedImages[imageIndex]) {
          const a = document.createElement('a')
          a.href = resizedImages[imageIndex]
          a.download = `${selectedAssetType}-${selectedSize}-${imageIndex + 1}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          // Small delay to ensure download starts
          setTimeout(() => resolve(), 200)
          return
        }

        // Otherwise create resized version from original
        const sourceImg = new window.Image()
        sourceImg.src = image.src
        await new Promise((resolve, reject) => {
          sourceImg.onload = resolve
          sourceImg.onerror = reject
        })

        const canvas = document.createElement('canvas')
        canvas.width = targetSize.width
        canvas.height = targetSize.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve()
          return
        }

        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(sourceImg, 0, 0, targetSize.width, targetSize.height)

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve()
            return
          }
          const url = URL.createObjectURL(blob)
          urlToRevoke = url
          const a = document.createElement('a')
          a.href = url
          a.download = `${selectedAssetType}-${selectedSize}-${imageIndex + 1}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          // Clean up after a delay to ensure download starts
          setTimeout(() => {
            URL.revokeObjectURL(url)
            resolve()
          }, 200)
        }, 'image/png')
      } catch (error) {
        console.error('Error downloading image:', error)
        if (urlToRevoke) {
          URL.revokeObjectURL(urlToRevoke)
        }
        resolve()
      }
    })
  }

  const downloadAllResizedImages = async () => {
    if (!targetSize || uploadedImages.length === 0) return

    for (let i = 0; i < uploadedImages.length; i++) {
      await downloadResizedImage(i)
      // Increased delay between downloads to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  const downloadSingleImage = async (imageIndex) => {
    const image = uploadedImages[imageIndex]
    if (!image || !targetSize) return

    const sourceImg = image.processed || new window.Image()
    if (!image.processed) {
      sourceImg.src = image.src
      await new Promise((resolve, reject) => {
        sourceImg.onload = resolve
        sourceImg.onerror = reject
      })
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetSize.width
    canvas.height = targetSize.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw image
    ctx.drawImage(sourceImg, 0, 0, targetSize.width, targetSize.height)


    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedAssetType}-${selectedSize}-${imageIndex + 1}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const handleAssetTypeSelect = (type) => {
    setSelectedAssetType(type)
    const assetConfig = ASSET_TYPES[type]
    if (assetConfig.sizes.length > 0) {
      setSelectedSize(assetConfig.sizes[0].value)
    } else {
      setSelectedSize(null)
    }
    // Clear resized images state to allow resizing again with new settings
    if (uploadedImages.length > 0) {
      // Clean up existing blob URLs
      Object.values(resizedImages).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
      setResizedImages({})
      setShowResizeView(false) // Go back to main view, resize button will be enabled
    }
  }

  const handleSizeSelect = (sizeValue) => {
    setSelectedSize(sizeValue)
    // Clear resized images state to allow resizing again with new settings
    if (uploadedImages.length > 0) {
      // Clean up existing blob URLs
      Object.values(resizedImages).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
      setResizedImages({})
      setShowResizeView(false) // Go back to main view, resize button will be enabled
    }
  }

  const handleCanvasClick = (e, canvas) => {
    // Canvas click handler removed - text functionality removed
  }

  const drawCanvas = useCallback((image, canvas) => {
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sourceImg = image.processed || new window.Image()
    if (image.processed) {
      canvas.width = sourceImg.width
      canvas.height = sourceImg.height
      
      const maxDisplayWidth = 800
      const scale = Math.min(1, maxDisplayWidth / sourceImg.width)
      canvas.style.width = `${sourceImg.width * scale}px`
      canvas.style.height = `${sourceImg.height * scale}px`

      ctx.drawImage(sourceImg, 0, 0)

    } else {
      // Show original image
      const img = new window.Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        const maxDisplayWidth = 800
        const scale = Math.min(1, maxDisplayWidth / img.width)
        canvas.style.width = `${img.width * scale}px`
        canvas.style.height = `${img.height * scale}px`

        ctx.drawImage(img, 0, 0)
      }
      img.src = image.src
    }
  }, [])

  React.useEffect(() => {
    if (currentImage) {
      const canvasId = `canvas-${currentImage.id}`
      const canvas = canvasRefs.current[canvasId]
      if (canvas) {
        const timer = setTimeout(() => {
          drawCanvas(currentImage, canvas)
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [currentImage, drawCanvas])

  return (
    <div className="app">
      <div className="container">
        <h1>🖼️ CroChrome</h1>
        <p className="subtitle">Resize images for Chrome Web Store assets</p>

        <Card className="asset-types-card">
          <div className="asset-pills-container">
            {Object.entries(ASSET_TYPES).map(([key, config]) => (
              <button
                key={key}
                className={`asset-pill ${selectedAssetType === key ? 'active' : ''}`}
                onClick={() => handleAssetTypeSelect(key)}
              >
                <span className="pill-text">{config.label}</span>
              </button>
            ))}
          </div>
          
          {selectedAssetType && ASSET_TYPES[selectedAssetType]?.sizes.length > 0 && (
            <div className="sizes-box">
              <div className="sizes-label">Dimensions:</div>
              <div className="sizes-list">
                {ASSET_TYPES[selectedAssetType].sizes.map((size) => (
                  <button
                    key={size.value}
                    className={`size-pill ${selectedSize === size.value ? 'active' : ''}`}
                    onClick={() => handleSizeSelect(size.value)}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {uploadedImages.length === 0 ? (
          <Card className="upload-card">
            <div className="upload-area">
                <AntUpload
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  showUploadList={false}
                  customRequest={onSelectFile}
                  multiple
                  className="upload-wrapper"
                  onDrop={handleDrop}
                >
                  <div className="upload-box">
                    <CloudUploadOutlined className="upload-icon" />
                    <div className="upload-text">Click or drag images to upload</div>
                    <div className="upload-hint">Supports JPEG and PNG formats</div>
                  </div>
                </AntUpload>
            </div>
          </Card>
        ) : (
          <Card className="upload-card">
            <div className="upload-area">
              <Space>
                <AntUpload
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  showUploadList={false}
                  customRequest={onSelectFile}
                  multiple
                  className="upload-wrapper"
                  onDrop={handleDrop}
                >
                  <Button
                    icon={<CloudUploadOutlined />}
                    type="default"
                    size="small"
                  >
                    Upload New
                  </Button>
                </AntUpload>
                {Object.keys(resizedImages).length < uploadedImages.length && (
                  <Button
                    onClick={resizeAllImages}
                    type="primary"
                    disabled={!selectedAssetType || !selectedSize || isResizing}
                    loading={isResizing}
                    size="small"
                    className="resize-all-btn"
                  >
                    {isResizing ? 'Resizing...' : 'Resize All Images'}
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        )}

        {uploadedImages.length > 0 && !showResizeView && (
          <Card className="images-list-card">
            <div className="images-list-header">
              <div className="images-count">{uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''}</div>
            </div>
            <div className="images-list">
              {uploadedImages.map((img, index) => (
                <div
                  key={img.id}
                  className={`image-thumbnail ${activeImageIndex === index ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  {img.src ? (
                    <div className="thumbnail-image-wrapper">
                      <img 
                        src={img.src} 
                        alt={`Thumbnail ${index + 1}`}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '4px', display: 'block' }}
                        onError={(e) => {
                          console.error('Error loading thumbnail:', img.src)
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="thumbnail-image-wrapper" style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#262626', borderRadius: '4px' }}>
                      <span style={{ color: '#8c8c8c', fontSize: '12px' }}>Loading...</span>
                    </div>
                  )}
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(index)
                    }}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {showResizeView && uploadedImages.length > 0 && (
          <Card className="resize-view-card">
            <div className="resize-view-header">
              <h3>Preview & Download</h3>
              <Space>
                <Button
                  onClick={() => setShowResizeView(false)}
                  size="small"
                >
                  Back
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadAllResizedImages}
                  size="small"
                  type="primary"
                >
                  Download All ({uploadedImages.length})
                </Button>
              </Space>
            </div>
            <div className="resize-comparison-grid">
              {uploadedImages.map((img, index) => (
                <div key={img.id} className="resize-comparison-item">
                  <div className="comparison-row">
                    <div className="comparison-image-container">
                      <div className="comparison-label">Original</div>
                      {img.src ? (
                        <img 
                          src={img.src} 
                          alt={`Original ${index + 1}`}
                          className="comparison-image"
                          onError={(e) => {
                            console.error('Error loading original image:', img.src)
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="resize-placeholder">Loading...</div>
                      )}
                    </div>
                    <ArrowRightOutlined className="arrow-icon" />
                    <div className="comparison-image-container">
                      <div className="comparison-label">Resized ({targetSize?.width}x{targetSize?.height})</div>
                      {resizedImages[index] ? (
                        <img 
                          src={resizedImages[index]} 
                          alt={`Resized ${index + 1}`}
                          className="comparison-image"
                          onError={(e) => {
                            console.error('Error loading resized image:', resizedImages[index])
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="resize-placeholder">Pending resize</div>
                      )}
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => downloadResizedImage(index)}
                        size="small"
                        type="primary"
                        disabled={!resizedImages[index]}
                        className="download-corner-btn download-resized-btn"
                        title="Download Resized"
                      >
                        <span className="download-btn-text">Download</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}


        {currentImage?.processed && (
          <Card className="canvas-card">
            <div className="canvas-wrapper">
              <canvas
                ref={(el) => {
                  if (currentImage) {
                    canvasRefs.current[`canvas-${currentImage.id}`] = el
                  }
                }}
                onClick={(e) => handleCanvasClick(e, canvasRefs.current[`canvas-${currentImage?.id}`])}
                style={{
                  maxWidth: '100%',
                  border: '1px solid #434343',
                  cursor: 'default'
                }}
              />
              <div className="canvas-actions">
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    // Move to next image or handle success
                    if (activeImageIndex < uploadedImages.length - 1) {
                      setActiveImageIndex(activeImageIndex + 1)
                    }
                  }}
                  size="small"
                  type="primary"
                  className="canvas-action-btn check-btn"
                  title="Confirm"
                />
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => downloadSingleImage(activeImageIndex)}
                  size="small"
                  type="primary"
                  disabled={!selectedSize}
                  className="canvas-action-btn download-btn"
                  title="Download"
                />
              </div>
            </div>
          </Card>
        )}
      </div>
      <footer className="app-footer">
        <p>
          Built by <a href="https://maskmanlucifer.github.io/lucifer/" target="_blank" rel="noopener noreferrer">maskmanlucifer</a>
        </p>
      </footer>
    </div>
  )
}

export default App
