import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, CircularProgress } from '@mui/material';

const Chatbot = () => {
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

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6">Chat with your documents</Typography>
      <Box sx={{ minHeight: 200, maxHeight: 300, overflowY: 'auto', my: 2 }}>
        {messages.map((msg, i) => (
          <Box key={i} sx={{ textAlign: msg.sender === 'user' ? 'right' : 'left', mb: 1 }}>
            <b>{msg.sender === 'user' ? 'You' : 'Bot'}:</b> {msg.text}
          </Box>
        ))}
        {loading && <CircularProgress size={20} />}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your question..."
        />
        <Button variant="contained" onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </Button>
      </Box>
    </Paper>
  );
};

export default Chatbot;
