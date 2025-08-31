import React, { useEffect, useMemo, useState } from 'react';

import { Container, Typography, Box, Button, TextField, Paper, CircularProgress, Tabs, Tab, AppBar, Toolbar, Grid, Alert, Stack, CssBaseline, useMediaQuery, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import LaptopIcon from '@mui/icons-material/LaptopOutlined';
import Chatbot from './Chatbot';

const UploadOrLink = ({ onIngest, loading }) => {
  const [tab, setTab] = useState(0);
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');

  const handleTabChange = (e, newValue) => setTab(newValue);
  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleUrlChange = (e) => setUrl(e.target.value);
  const handleUpload = () => file && onIngest({ file });
  const handleUrlSubmit = () => url && onIngest({ url });

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 3 }}>
      <Typography variant="h6" gutterBottom>
        Ingest a Document or Repository
      </Typography>
      <Tabs value={tab} onChange={handleTabChange} aria-label="upload or link">
        <Tab icon={<CloudUploadIcon />} label="Upload File" />
        <Tab icon={<LinkIcon />} label="Repository Link" />
      </Tabs>
      {tab === 0 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <input type="file" onChange={handleFileChange} />
          <Button variant="contained" onClick={handleUpload} disabled={loading || !file} sx={{ ml: 2 }}>
            Upload
          </Button>
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <TextField label="Repository Link" value={url} onChange={handleUrlChange} fullWidth />
          <Button variant="contained" onClick={handleUrlSubmit} disabled={loading || !url} sx={{ ml: 2 }}>
            Ingest
          </Button>
        </Box>
      )}
      {loading && <CircularProgress sx={{ mt: 2 }} />}
    </Paper>
  );
};


const App = () => {
  // Theme preference: 'system' | 'light' | 'dark'
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [themePref, setThemePref] = useState('system');
  useEffect(() => {
    const saved = localStorage.getItem('themePref');
    if (saved === 'light' || saved === 'dark' || saved === 'system') setThemePref(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem('themePref', themePref);
  }, [themePref]);
  const mode = themePref === 'system' ? (prefersDark ? 'dark' : 'light') : themePref;
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const [ingested, setIngested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState([]);

  const addStatus = (msg, type = 'info') => setStatus((s) => [...s, { msg, type }]);
  const clearStatus = () => setStatus([]);

  const handleIngest = async (data) => {
    clearStatus();
    setLoading(true);
    try {
      addStatus('Uploading...', 'info');
      let res;
      if (data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        res = await fetch('/api/ingest/file', {
          method: 'POST',
          body: formData,
        });
      } else if (data.url) {
        res = await fetch('/api/ingest/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: data.url }),
        });
      }
      if (!res.ok) throw new Error('Ingestion failed');
      addStatus('Ingesting and normalizing...', 'info');
      const result = await res.json();
      addStatus(`Chunked into ${result.chunks} pieces.`, 'info');
      addStatus('Embedding and vectorizing...', 'info');
      addStatus('Success! Document is ready for Q&A.', 'success');
      setIngested(true);
    } catch (e) {
      addStatus('Error: ' + (e.message || 'Ingestion failed.'), 'error');
    }
    setLoading(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="sticky" color="primary" elevation={2}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Universal Enterprise RAG Platform
            </Typography>
            <ToggleButtonGroup
              size="small"
              value={themePref}
              exclusive
              onChange={(_, v) => v && setThemePref(v)}
              aria-label="Theme selection"
              color="secondary"
            >
              <ToggleButton value="light" aria-label="Light theme">
                <LightModeIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="dark" aria-label="Dark theme">
                <DarkModeIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="system" aria-label="System theme">
                <LaptopIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={4}>
              <UploadOrLink onIngest={handleIngest} loading={loading} />
              {status.length > 0 && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {status.map((s, i) => (
                    <Alert key={i} severity={s.type === 'error' ? 'error' : s.type === 'success' ? 'success' : 'info'}>
                      {s.msg}
                    </Alert>
                  ))}
                </Stack>
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <Chatbot disabled={!ingested} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;
