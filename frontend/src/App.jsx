import React, { useState } from 'react';

import { Container, Typography, Box, Button, TextField, Paper, CircularProgress, Tabs, Tab } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
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
    <Paper sx={{ p: 3, mb: 3 }}>
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
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Universal Enterprise RAG Platform
      </Typography>
      <Typography align="center" sx={{ mb: 3 }}>
        Upload a file or provide a repository link. Ask questions via the chatbot below!
      </Typography>
      {status.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          {status.map((s, i) => (
            <Typography key={i} color={s.type === 'error' ? 'error' : s.type === 'success' ? 'green' : 'textPrimary'}>
              {s.msg}
            </Typography>
          ))}
        </Paper>
      )}
      {!ingested ? (
        <UploadOrLink onIngest={handleIngest} loading={loading} />
      ) : (
        <Chatbot />
      )}
    </Container>
  );
};

export default App;
