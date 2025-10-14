import React, { useEffect, useMemo, useState } from 'react';

import { Container, Typography, Box, Button, TextField, Paper, CircularProgress, Tabs, Tab, AppBar, Toolbar, Grid, Alert, Stack, CssBaseline, useMediaQuery, ToggleButton, ToggleButtonGroup, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import LaptopIcon from '@mui/icons-material/LaptopOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import Chatbot from './Chatbot';

const UploadOrLink = ({ onIngest, loading, uploadedFiles, onDeleteFile, onRefreshFiles }) => {
  const [tab, setTab] = useState(0);
  const [files, setFiles] = useState([]);
  const [url, setUrl] = useState('');
  const fileInputRef = React.useRef(null);
  const [key, setKey] = useState(0); // Key to force re-render of input

  const handleTabChange = (e, newValue) => setTab(newValue);
  
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log('Files selected:', selectedFiles.map(f => f.name));
    setFiles(selectedFiles);
  };
  
  const handleUrlChange = (e) => setUrl(e.target.value);
  
  const handleUpload = async () => {
    if (files.length > 0) {
      console.log('Starting upload for:', files.map(f => f.name));
      const success = await onIngest({ files });
      
      // Reset regardless of success to allow re-selection
      console.log('Upload finished, resetting input. Success:', success);
      setFiles([]);
      setKey(prevKey => prevKey + 1); // Force input to re-render
    }
  };
  
  const handleUrlSubmit = async () => {
    if (url) {
      await onIngest({ url });
      setUrl(''); // Clear URL after submit
    }
  };

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
        <>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
            <input 
              key={key}
              type="file" 
              onChange={handleFileChange} 
              multiple 
              ref={fileInputRef}
              disabled={loading}
            />
            <Button 
              variant="contained" 
              onClick={handleUpload} 
              disabled={loading || files.length === 0} 
              sx={{ ml: 2 }}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </Box>
          
          {/* Display uploaded files */}
          {uploadedFiles && uploadedFiles.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Uploaded Files:
              </Typography>
              <List dense>
                {uploadedFiles.map((filename, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: 'background.paper'
                    }}
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => onDeleteFile(filename)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <InsertDriveFileIcon sx={{ mr: 1, color: 'primary.main' }} fontSize="small" />
                    <ListItemText 
                      primary={filename}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </>
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
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const addStatus = (msg, type = 'info') => setStatus((s) => [...s, { msg, type }]);
  const clearStatus = () => setStatus([]);

  // Fetch list of uploaded files
  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.status === 'success') {
        setUploadedFiles(data.files || []);
        if (data.files && data.files.length > 0) {
          setIngested(true);
        }
      }
    } catch (e) {
      console.error('Failed to fetch uploaded files:', e);
    }
  };

  // Load files on component mount
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and all its chunks?`)) {
      return;
    }
    
    setLoading(true);
    clearStatus();
    try {
      addStatus(`Deleting ${filename}...`, 'info');
      const res = await fetch(`/api/file/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      
      if (result.status === 'success') {
        addStatus(`Successfully deleted ${filename} (${result.deleted_count} chunks removed)`, 'success');
        await fetchUploadedFiles(); // Refresh file list
      } else {
        addStatus(`Error: ${result.message}`, 'error');
      }
    } catch (e) {
      addStatus('Error: ' + (e.message || 'Delete failed.'), 'error');
    }
    setLoading(false);
  };

  const handleIngest = async (data) => {
    clearStatus();
    setLoading(true);
    let success = false;
    try {
      if (data.files) {
        // Handle multiple files
        for (const file of data.files) {
          addStatus(`Uploading ${file.name}...`, 'info');
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/ingest/file', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
          const result = await res.json();
          addStatus(`${file.name}: Chunked into ${result.chunks} pieces.`, 'info');
        }
        addStatus('All files uploaded successfully!', 'success');
        setIngested(true);
        await fetchUploadedFiles(); // Refresh file list
        success = true;
      } else if (data.url) {
        addStatus('Uploading...', 'info');
        const res = await fetch('/api/ingest/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: data.url }),
        });
        if (!res.ok) throw new Error('Ingestion failed');
        const result = await res.json();
        addStatus(`Chunked into ${result.chunks} pieces.`, 'info');
        addStatus('Success! Document is ready for Q&A.', 'success');
        setIngested(true);
        await fetchUploadedFiles(); // Refresh file list for URL too
        success = true;
      }
    } catch (e) {
      addStatus('Error: ' + (e.message || 'Ingestion failed.'), 'error');
      success = false;
    }
    setLoading(false);
    return success;
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
              <UploadOrLink 
                onIngest={handleIngest} 
                loading={loading}
                uploadedFiles={uploadedFiles}
                onDeleteFile={handleDeleteFile}
                onRefreshFiles={fetchUploadedFiles}
              />
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
