export const theme = {
  colors: {
    //  Backgrounds 
    background: '#000000',
    surface: '#111111',
    surfaceHigh: '#1C1C1E',
    border: '#2C2C2E',
    borderLight: '#3A3A3C',

    //  Semantic 
    green: '#00C805',       // Robinhood green — buy / positive
    greenBg: 'rgba(0,200,5,0.10)',
    red: '#FF3B30',       // sell / negative
    redBg: 'rgba(255,59,48,0.10)',
    gold: '#FFB800',       // warning / reconnecting

    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textMuted: '#48484A',

    buy: '#00C805',
    sell: '#FF3B30',
  },

  font: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 24,
    xxl: 34,
    xxxl: 44,

    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
} as const;