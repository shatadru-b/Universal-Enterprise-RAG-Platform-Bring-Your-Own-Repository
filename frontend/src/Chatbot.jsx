import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Tooltip } from '@mui/material';

const Chatbot = ({ disabled = false }) => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Ask me anything about your ingested documents!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: 'user', text: input }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      });
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        { sender: 'bot', text: data.answer || data.status || 'No answer found.' }
      ]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { sender: 'bot', text: 'Error contacting backend.' }
      ]);
    }
    setInput('');
    setLoading(false);
  };

  const sendDisabled = disabled || loading || !input.trim();

  return (
    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6">Chat with your documents</Typography>
      <Box sx={{ flex: 1, minHeight: 260, maxHeight: 520, overflowY: 'auto', my: 2, pr: 1 }}>
        {messages.map((msg, i) => (
          <Box key={i} sx={{ textAlign: msg.sender === 'user' ? 'right' : 'left', mb: 1 }}>
            <b>{msg.sender === 'user' ? 'You' : 'Bot'}:</b> {msg.text}
          </Box>
        ))}
        {loading && <CircularProgress size={20} />}
      </Box>
      <Tooltip title={disabled ? 'Ingest a document to start chatting' : ''} placement="top">
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            disabled={disabled}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !sendDisabled && handleSend()}
            placeholder={disabled ? 'Upload or link a document to enable chat...' : 'Type your question...'}
          />
          <Button variant="contained" onClick={handleSend} disabled={sendDisabled}>
            Send
          </Button>
        </Box>
      </Tooltip>
    </Paper>
  );
};

export default Chatbot;
