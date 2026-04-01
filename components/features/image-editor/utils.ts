export const getGradientColors = (gradientType: string): string[] => {
  switch (gradientType) {
    case 'rainbow':
      return ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
    case 'sunset':
      return ['#ff6b6b', '#ffa500', '#ff1493']
    case 'ocean':
      return ['#00c9ff', '#0099cc', '#0066cc']
    case 'forest':
      return ['#90ee90', '#228b22', '#006400']
    case 'purple':
      return ['#9370db', '#8a2be2', '#4b0082']
    default:
      return ['#ff0000', '#0000ff']
  }
}

export const getSliderMax = (filterName: string): number => {
  switch (filterName) {
    case 'brightness':
    case 'contrast':
    case 'saturate':
      return 200
    case 'hue':
      return 360
    default:
      return 100
  }
}

export const getEmojiForType = (type: string): string => {
  switch (type) {
    case 'love':
      return '💕'
    case 'love-love':
      return '💖'
    case 'congratulation':
      return '🎉'
    case 'happy-birthday':
      return '🎂'
    case 'thank-you':
      return '🙏'
    case 'best-wishes':
      return '✨'
    case 'merry-christmas':
      return '🎄'
    case 'happy-new-year':
      return '🎊'
    case 'good-luck':
      return '🍀'
    case 'well-done':
      return '👏'
    default:
      return '⭐'
  }
}
