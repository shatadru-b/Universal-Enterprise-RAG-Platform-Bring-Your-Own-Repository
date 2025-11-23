import React from 'react';
import { Box, Typography, Grid, Card, CardContent, IconButton, Chip } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDistanceToNow } from 'date-fns';

function DocumentsView({ files, onDelete }) {

    const getIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'pdf') return <PictureAsPdfIcon sx={{ fontSize: 40, color: '#f44336' }} />;
        if (['doc', 'docx'].includes(ext)) return <DescriptionIcon sx={{ fontSize: 40, color: '#2196f3' }} />;
        return <InsertDriveFileIcon sx={{ fontSize: 40, color: '#757575' }} />;
    };

    const formatSize = (bytes) => {
        if (!bytes) return 'Unknown size';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#444' }}>
                Documents
            </Typography>

            {files.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 10, color: '#888' }}>
                    <InsertDriveFileIcon sx={{ fontSize: 80, opacity: 0.3 }} />
                    <Typography variant="h6" sx={{ mt: 2 }}>No files yet</Typography>
                    <Typography variant="body2">Tap the + button to upload</Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {files.map((file) => (
                        <Grid item xs={12} sm={6} md={4} key={file.filename}>
                            <Card sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                                <Box sx={{ p: 2 }}>
                                    {getIcon(file.filename)}
                                </Box>
                                <CardContent sx={{ flex: '1 0 auto', pl: 0 }}>
                                    <Typography component="div" variant="subtitle1" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                                        {file.filename}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" component="div">
                                        {formatSize(file.file_size)} • {file.upload_time ? formatDistanceToNow(new Date(file.upload_time), { addSuffix: true }) : 'Unknown date'}
                                    </Typography>
                                </CardContent>
                                <Box sx={{ p: 1 }}>
                                    <IconButton onClick={() => onDelete(file.filename)} size="small">
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}

export default DocumentsView;
