# VideoPresenter Pro

<img width="1704" alt="Screenshot 2025-07-02 at 20 04 36" src="https://github.com/user-attachments/assets/a6f90478-ae36-4ef1-ba2e-946c72f8c885" />


A professional video presentation and recording application built with Next.js, featuring drag & drop video positioning, screen capture, and real-time effects.

## ✨ Features

### 🎥 Recording & Export
- **Multi-Source Recording**: Camera, Screen, or Both (combined stream with system and mic audio)
- **High-Quality Output**: WebM/MP4 recording with bitrate tuning
- **Format Conversion**: Convert to WebM, MP4, or animated WebP in-browser with progress
- **Real-Time Timer**: Live duration display and preview
- **One-Click Download**: Instant file download

### 🧠 Privacy & Effects
- **Human Blurring (BodyPix)**: Real-time human detection and background blur with intensity control
- **Performance-Aware Pipeline**: FPS, processing time, fallback and frame-skipping when needed
- **Video Filters**: None, Grayscale, Sepia, Invert
- **Background Modes**: Visible, Blurred, or Hidden (solid color)

### 🎨 Presenter Customization
- **Drag & Drop Positioning**: Place camera bubble anywhere on the board
- **Advanced Shapes**: Rectangle, Circle, Rounded, Hexagon, Diamond, Heart, Star
- **Sizes & Colors**: Small/Medium/Large/X-Large, with professional color borders
- **Virtual Backgrounds**: Curated presets (tech, space, ocean, dark-pro, modern-office, forest, sunset, waves, city, warm, clean-white, soft-blur) + custom image upload

### 🧩 Board & Assets
- **Drag & Drop Files**: Add images (PNG/JPG/GIF/WEBP), videos (MP4/WEBM/MOV), and documents (PDF/PPTX/KEY)
- **Document Viewer**: Inline PDF viewer; helpful prompts for PPT/Keynote with quick download
- **Notes**: Create editable sticky notes anywhere on the board
- **Zoom & Pan**: Mouse wheel zoom (0.1×–3×), Ctrl/Cmd shortcuts, and panning for large boards

### 🗣️ Teleprompter
- **Floating Teleprompter**: Adjustable speed, font size, line-height, opacity, and mirror mode
- **Popup Mode During Recording**: Optionally auto-open in a separate window while recording
- **Compact/Minimized Modes**: Keep it unobtrusive while presenting

### 🧰 Utilities
- **Picture-in-Picture**: Shape-aware PiP with canvas rendering for circular/processed views
- **Camera Popup**: Separate window with recording indicator and PiP toggle
- **Localization**: Language switcher (English 🇺🇸 / Portuguese 🇧🇷) persisted in localStorage

### 🖥️ Professional Interface
- **Modern UI** built with shadcn/ui and Radix primitives
- **Responsive Design** with real-time preview and status indicators
- **Organized Controls** in a docked right sidebar with quick actions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser with camera/microphone access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd videopresenter-pro
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.3 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **Media & Capture**: MediaRecorder, getUserMedia, getDisplayMedia, Picture-in-Picture
- **ML**: TensorFlow.js + BodyPix for human segmentation
- **Workers**: Web Workers for offloading detection
- **Transcoding**: ffmpeg.js (WebAssembly) for in-browser conversion
- **i18n**: Lightweight context-based translations (EN / PT-BR)

## 📱 Browser Support

- Chrome 80+ (recommended)
- Firefox 75+
- Safari 14+
- Edge 80+

*Note: Camera and screen recording features require HTTPS in production*

## 🎮 Usage

1. Allow camera/microphone access
2. Choose recording source (Camera, Screen, Both)
3. Customize the presenter: shape, size, color, background mode, filters
4. Add assets by dragging files onto the board (images/videos/PDF/PPTX/KEY)
5. Toggle Human Blurring and adjust intensity as needed
6. Open Teleprompter and tune speed/size; optionally use popup while recording
7. Start recording; use Picture-in-Picture or Camera Popup if desired
8. Stop recording to preview; export as WebM/MP4/WebP and download

### ⌨️ Keyboard & Mouse Shortcuts
- **Toggle Sidebar**: Tab (when not focused on inputs)
- **Zoom In/Out/Reset**: Ctrl/Cmd + = / - / 0
- **Zoom via Wheel**: Mouse wheel (Shift/Ctrl on some platforms)
- **Pan Board**: Hold Ctrl/Cmd and drag when zoomed

## 🔧 Configuration

The app includes several customizable settings:

- **Video Quality**: Adjustable bitrates for recording
- **Export Formats**: WebM, MP4, WebP (with in-browser conversion)
- **Canvas & Board**: Zoomable, pannable board with asset management
- **Presenter Styles**: Shapes, colors, filters, background modes and virtual backgrounds
- **Privacy Controls**: Human blurring with intensity and performance monitoring

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support and questions, please open an issue on GitHub.

---

**VideoPresenter Pro** - Professional video presentations made simple.
