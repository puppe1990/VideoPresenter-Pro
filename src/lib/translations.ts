export type Language = 'en' | 'pt-br'

export interface Translations {
  // Top Bar
  videoPresenter: string
  beta: string
  
  // Virtual Background
  virtualBackground: string
  moreBackgrounds: string
  noBackground: string
  spaceBackground: string
  techBackground: string
  oceanBackground: string
  sunsetBackground: string
  darkProBackground: string
  professionalBackgrounds: string
  modernOfficeBackground: string
  libraryBackground: string
  forestBackground: string
  abstractWavesBackground: string
  warmOfficeBackground: string
  cityBackground: string
  warmGradientBackground: string
  cleanWhiteBackground: string
  softBlurBackground: string

  // Custom Background
  customBackground: string
  uploadBackground: string
  removeBackground: string

  // Filters
  filters: string
  noFilter: string
  grayscale: string
  sepia: string
  invert: string
  
  // Recording Controls
  recording: string
  record: string
  camera: string
  screen: string
  both: string
  stopRecording: string
  recordingActive: string
  screenCameraRecording: string
  preview: string
  exportFormat: string
  download: string
  recordAgain: string
  converting: string
  conversionProgress: string
  
  // Picture in Picture
  stayVisible: string
  pictureInPicture: string
  
  // Real Background
  realBackground: string
  visible: string
  blurred: string
  hidden: string
  
  // Shape
  shape: string
  
  // Color
  color: string
  blue: string
  purple: string
  emerald: string
  amber: string
  red: string
  gray: string
  
  // Video Size
  videoSize: string
  small: string
  medium: string
  large: string
  xlarge: string
  size: string
  position: string
  reset: string
  
  // Additional Settings
  additionalSettings: string
  teleprompter: string
  cameraPopup: string
  advancedOptions: string
  addNote: string
  
  // Sidebar
  hideSidebar: string
  showSidebar: string
  
  // Language
  language: string
  english: string
  portuguese: string
  
  // Common
  close: string
  open: string
  settings: string
}

export const translations: Record<Language, Translations> = {
  en: {
    // Top Bar
    videoPresenter: 'Video Presenter',
    beta: 'Beta',
    
    // Virtual Background
    virtualBackground: 'Virtual background',
    moreBackgrounds: 'More backgrounds',
    noBackground: 'No background (Green screen effect)',
    spaceBackground: 'Space background',
    techBackground: 'Tech/Futuristic background',
    oceanBackground: 'Ocean background',
    sunsetBackground: 'Sunset background',
    darkProBackground: 'Dark professional background',
    professionalBackgrounds: 'Professional backgrounds',
    modernOfficeBackground: 'Modern office background',
    libraryBackground: 'Library background',
    forestBackground: 'Forest background',
    abstractWavesBackground: 'Abstract waves background',
    warmOfficeBackground: 'Warm office background',
    cityBackground: 'City skyline background',
    warmGradientBackground: 'Warm gradient background',
    cleanWhiteBackground: 'Clean white background',
    softBlurBackground: 'Soft blur background',

    // Custom Background
    customBackground: 'Custom background',
    uploadBackground: 'Upload background',
    removeBackground: 'Remove background',

    // Filters
    filters: 'Video filters',
    noFilter: 'No filter',
    grayscale: 'Grayscale',
    sepia: 'Sepia',
    invert: 'Invert',
    
    // Recording Controls
    recording: 'Recording',
    record: 'Record',
    camera: 'Camera',
    screen: 'Screen',
    both: 'Both',
    stopRecording: 'Stop Recording',
    recordingActive: 'Recording',
    screenCameraRecording: 'Screen + Camera recording active',
    preview: 'Preview',
    exportFormat: 'Export Format:',
    download: 'Download',
    recordAgain: 'Record Again',
    converting: 'Converting to',
    conversionProgress: 'This may take a few moments...',
    
    // Picture in Picture
    stayVisible: 'Stay Visible',
    pictureInPicture: 'Picture-in-Picture',
    
    // Real Background
    realBackground: 'Real background',
    visible: 'Visible',
    blurred: 'Blurred',
    hidden: 'Hidden',
    
    // Shape
    shape: 'Shape',
    
    // Color
    color: 'Color',
    blue: 'Blue',
    purple: 'Purple',
    emerald: 'Emerald',
    amber: 'Amber',
    red: 'Red',
    gray: 'Gray',
    
    // Video Size
    videoSize: 'Video Size',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    xlarge: 'X-Large',
    size: 'Size',
    position: 'Position',
    reset: 'Reset',
    
    // Additional Settings
    additionalSettings: 'Additional settings',
    teleprompter: 'Teleprompter',
    cameraPopup: 'Camera Popup',
    advancedOptions: 'Advanced options',
    addNote: 'Add Note',
    
    // Sidebar
    hideSidebar: 'Hide sidebar (Tab)',
    showSidebar: 'Show sidebar (Tab)',
    
    // Language
    language: 'Language',
    english: 'English',
    portuguese: 'Português (BR)',
    
    // Common
    close: 'Close',
    open: 'Open',
    settings: 'Settings',
  },
  
  'pt-br': {
    // Top Bar
    videoPresenter: 'Apresentador de Vídeo',
    beta: 'Beta',
    
    // Virtual Background
    virtualBackground: 'Fundo virtual',
    moreBackgrounds: 'Mais fundos',
    noBackground: 'Sem fundo (Efeito chroma key)',
    spaceBackground: 'Fundo espacial',
    techBackground: 'Fundo tecnológico/futurista',
    oceanBackground: 'Fundo oceânico',
    sunsetBackground: 'Fundo pôr do sol',
    darkProBackground: 'Fundo profissional escuro',
    professionalBackgrounds: 'Fundos profissionais',
    modernOfficeBackground: 'Fundo escritório moderno',
    libraryBackground: 'Fundo biblioteca',
    forestBackground: 'Fundo floresta',
    abstractWavesBackground: 'Fundo ondas abstratas',
    warmOfficeBackground: 'Fundo escritório acolhedor',
    cityBackground: 'Fundo cidade',
    warmGradientBackground: 'Fundo gradiente quente',
    cleanWhiteBackground: 'Fundo branco limpo',
    softBlurBackground: 'Fundo desfoque suave',

    // Custom Background
    customBackground: 'Fundo personalizado',
    uploadBackground: 'Enviar fundo',
    removeBackground: 'Remover fundo',

    // Filters
    filters: 'Filtros de vídeo',
    noFilter: 'Sem filtro',
    grayscale: 'Tons de cinza',
    sepia: 'Sépia',
    invert: 'Inverter',
    
    // Recording Controls
    recording: 'Gravação',
    record: 'Gravar',
    camera: 'Câmera',
    screen: 'Tela',
    both: 'Ambos',
    stopRecording: 'Parar Gravação',
    recordingActive: 'Gravando',
    screenCameraRecording: 'Gravação de Tela + Câmera ativa',
    preview: 'Prévia',
    exportFormat: 'Formato de Exportação:',
    download: 'Baixar',
    recordAgain: 'Gravar Novamente',
    converting: 'Convertendo para',
    conversionProgress: 'Isso pode levar alguns momentos...',
    
    // Picture in Picture
    stayVisible: 'Manter Visível',
    pictureInPicture: 'Picture-in-Picture',
    
    // Real Background
    realBackground: 'Fundo real',
    visible: 'Visível',
    blurred: 'Desfocado',
    hidden: 'Oculto',
    
    // Shape
    shape: 'Forma',
    
    // Color
    color: 'Cor',
    blue: 'Azul',
    purple: 'Roxo',
    emerald: 'Esmeralda',
    amber: 'Âmbar',
    red: 'Vermelho',
    gray: 'Cinza',
    
    // Video Size
    videoSize: 'Tamanho do Vídeo',
    small: 'Pequeno',
    medium: 'Médio',
    large: 'Grande',
    xlarge: 'Extra Grande',
    size: 'Tamanho',
    position: 'Posição',
    reset: 'Redefinir',
    
    // Additional Settings
    additionalSettings: 'Configurações adicionais',
    teleprompter: 'Teleprompter',
    cameraPopup: 'Pop-up da Câmera',
    advancedOptions: 'Opções avançadas',
    addNote: 'Adicionar nota',
    
    // Sidebar
    hideSidebar: 'Ocultar barra lateral (Tab)',
    showSidebar: 'Mostrar barra lateral (Tab)',
    
    // Language
    language: 'Idioma',
    english: 'English',
    portuguese: 'Português (BR)',
    
    // Common
    close: 'Fechar',
    open: 'Abrir',
    settings: 'Configurações',
  }
} 