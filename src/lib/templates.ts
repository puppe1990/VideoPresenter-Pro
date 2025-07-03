export interface Template {
  name: string
  intro: string
  settings: Partial<import('../components/VideoPresenter').PresenterSettings>
}

export const templates: Template[] = [
  {
    name: 'News',
    intro: 'Welcome to the daily news update',
    settings: {
      backgroundType: 'visible',
      shape: 'rectangle',
      color: '#ef4444',
      size: 'medium',
      position: { x: 16, y: 16 }
    }
  },
  {
    name: 'Corporate',
    intro: 'Company quarterly report',
    settings: {
      backgroundType: 'blurred',
      shape: 'rounded',
      color: '#3b82f6',
      size: 'large',
      position: { x: 32, y: 32 }
    }
  },
  {
    name: 'Social',
    intro: 'Hey everyone, welcome back!',
    settings: {
      backgroundType: 'hidden',
      shape: 'circle',
      color: '#8b5cf6',
      size: 'small',
      position: { x: 24, y: 24 }
    }
  }
]
