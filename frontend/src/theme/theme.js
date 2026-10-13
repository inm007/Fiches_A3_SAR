import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E60012', dark: '#B8000E' },
    background: { default: '#F7F7F8', paper: '#FFFFFF' },
    text: { primary: '#1A1A1F', secondary: '#6B6B76' },
    success: { main: '#167A4A' },
    error: { main: '#C62828' },
    warning: { main: '#8A5A00' },
    info: { main: '#1D4ED8' },
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  shape: {
    borderRadius: 6,
  },
})

export default theme
