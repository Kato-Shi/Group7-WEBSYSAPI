const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notes API - Student Learning Module',
      version: '1.0.0',
      description: `
A comprehensive RESTful API for managing personal notes.

#### Features
-Create, read, update, and delete notes  
-Advanced search functionality  
-Category-based organization  
-Pin important notes  
-Archive old notes  
-Priority levels  
-Pagination support  

#### Getting Started
1. Create a note using **POST /api/notes**  
2. Retrieve notes using **GET /api/notes**  
3. Search notes using **GET /api/notes/search**  

Built with Express.js and Sequelize for educational purposes.
      `,
      contact: {
        name: 'Course Instructor',
        email: 'instructor@university.edu'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://your-app.herokuapp.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Note: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the note',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            title: {
              type: 'string',
              maxLength: 200,
              description: 'Title of the note',
              example: 'My Important Note'
            },
            content: {
              type: 'string',
              description: 'Main content of the note',
              example: 'This is the detailed content of my note with all the important information.'
            },
            category: {
              type: 'string',
              maxLength: 50,
              default: 'general',
              description: 'Category for organizing notes',
              example: 'work'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for better organization',
              example: ['important', 'meeting', 'project']
            },
            isPinned: {
              type: 'boolean',
              default: false,
              description: 'Whether the note is pinned to the top',
              example: false
            },
            isArchived: {
              type: 'boolean',
              default: false,
              description: 'Whether the note is archived',
              example: false
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium',
              description: 'Priority level of the note',
              example: 'high'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the note was created',
              example: '2024-01-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the note was last updated',
              example: '2024-01-15T14:45:00.000Z'
            }
          }
        },
        CreateNoteRequest: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string', maxLength: 200, example: 'Meeting Notes' },
            content: { type: 'string', example: 'Discussed project timeline and deliverables' },
            category: { type: 'string', example: 'work' },
            tags: { type: 'array', items: { type: 'string' }, example: ['meeting', 'project'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' },
            isPinned: { type: 'boolean', example: false }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/Note' },
            message: { type: 'string', example: 'Operation completed successfully' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error description' }
          }
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            currentPage: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 5 },
            totalItems: { type: 'integer', example: 48 },
            itemsPerPage: { type: 'integer', example: 10 }
          }
        }
      }
    }
  },
  apis: ['../src/routes/**/*.js']
};

const specs = swaggerJsdoc(options);
module.exports = { swaggerUI, specs };
