const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const {swaggerUI, specs} = require('./config/swagger');

const notesRoutes = require('./routes/notes');
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

app.use('/api/notes', notesRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Notes API',
    version: '1.0.0',
    status: 'running',
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api-docs',swaggerUI.serve, swaggerUI.setup(specs,{
  customCss: '.swagger-ui .topbar{display:none}',
  customSiteTitle: 'Notes API Documentation',
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true
  }
}));

module.exports = app;
