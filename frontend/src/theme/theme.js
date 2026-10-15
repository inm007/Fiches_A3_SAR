import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E3000F', dark: '#B0000F' },
    background: { default: '#F7F7F8', paper: '#FFFFFF' },
    text: { primary: '#1A1A1F', secondary: '#6B6B76' },
    success: { main: '#1F7A4D' },
    error: { main: '#B42318' },
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
