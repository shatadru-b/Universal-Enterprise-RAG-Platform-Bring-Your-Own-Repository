import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Paper, CircularProgress, Avatar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

function ChatView() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I can help you find information in your documents. What would you like to know?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/ask`, { question: userMessage.content });
            const botMessage = { role: 'assistant', content: response.data.answer };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the server.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#444' }}>
                Chat Assistant
            </Typography>

            {/* Messages Area */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.map((msg, index) => (
                    <Box
                        key={index}
                        sx={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-start',
                            gap: 1
                        }}
                    >
                        {msg.role === 'assistant' && (
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                <SmartToyIcon fontSize="small" />
                            </Avatar>
                        )}

                        <Paper
                            elevation={1}
                            sx={{
                                p: 2,
                                maxWidth: '80%',
                                borderRadius: 4,
                                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                                color: msg.role === 'user' ? 'white' : 'text.primary',
                                borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                                borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                            }}
                        >
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </Paper>

                        {msg.role === 'user' && (
                            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                <PersonIcon fontSize="small" />
                            </Avatar>
                        )}
                    </Box>
                ))}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <SmartToyIcon fontSize="small" />
                        </Avatar>
                        <Paper elevation={1} sx={{ p: 2, borderRadius: 4, borderTopLeftRadius: 4 }}>
                            <CircularProgress size={20} />
                        </Paper>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Paper
                component="form"
                sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 8, bgcolor: '#f1f3f4' }}
                elevation={0}
            >
                <TextField
                    sx={{ ml: 1, flex: 1, '& fieldset': { border: 'none' } }}
                    placeholder="Ask a question..."
                    variant="outlined"
                    fullWidth
                    multiline
                    maxRows={4}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <IconButton color="primary" sx={{ p: '10px' }} onClick={handleSend} disabled={loading}>
                    <SendIcon />
                </IconButton>
            </Paper>
        </Box>
    );
}

export default ChatView;
