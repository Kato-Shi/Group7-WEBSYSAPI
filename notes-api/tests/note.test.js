const request = require('supertest');
const app = require('../src/app');
const  Note  = require('../src/models/Note');

describe('Notes API Testing Suite', () => {
  // Clean database before each test
beforeEach(async () => {
    await Note.destroy({ where: {} });
});

describe('POST /api/notes - Create Note', () => {
    it('should create a new note with valid data', async () => {
    const noteData = {
        title: 'Test Note',
        content: 'This is a test note content',
        category: 'test',
        tags: ['test', 'api'],
        priority: 'high'
    };
    const response = await request(app)
        .post('/api/notes')
        .send(noteData)
        .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe(noteData.title);
    expect(response.body.data.content).toBe(noteData.content);
    expect(response.body.data.category).toBe(noteData.category);
    expect(response.body.data.priority).toBe(noteData.priority);
    expect(response.body.data.id).toBeDefined();
    });

    it('should return 400 for missing title', async () => {
    const noteData = { 
        content: 'Content without title' 
    };
    const response = await request(app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Title and content are required');
    });

    it('should return 400 for empty title', async () => {
    const noteData = { 
        title: ' ', 
        content: 'Valid content' 
    };
    const response = await request(app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('cannot be empty');
    });

    it('should return 400 for invalid priority', async () => {
    const noteData = { 
        title: 'Valid Title', 
        content: 'Valid Content', 
        priority: 'urgent' // Invalid priority
    };
    const response = await request(app)
        .post('/api/notes')
        .send(noteData)
        .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Priority must be');
    });
  });

  describe('GET /api/notes -- Retrieve Notes', () => {
    //Create test data before each test in the group
    beforeEach(async () => {
      await Note.bulkCreate([
        { 
            title: 'Work Note',
            content: 'Important work content', 
            category: 'work', priority: 'high', 
            isPinned: true 
        },
        { 
            title: 'Personal Note', 
            content: 'Personal reminder', 
            category: 'personal', 
            priority: 'medium' 
        },
        { 
            title: 'Archived Note', 
            content: 'Old content', 
            category: 'old', 
            isArchived: true }
      ]);
    });

    it('should get all active notes', async () => {
    const response = await request(app)
      .get('/api/notes')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2); // only non-archived
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.totalItems).toBe(2);
    });

    it('should filter notes by category', async () => {
    const response = await request(app)
        .get('/api/notes?category=work')
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].category).toBe('work');
    });

    it('should show pinned notes first', async () => {
    const response = await request(app)
        .get('/api/notes')
        .expect(200);

    expect(response.body.data[0].isPinned).toBe(true);
    expect(response.body.data[0].title).toBe('Work Note');
    });

    it('should include archived notes when requested', async () => {
    const response = await request(app)
        .get('/api/notes?archived=true')
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].isArchived).toBe(true);
    });
  });

    describe('GET /api/notes/search - Search Functionality', () => {
    beforeEach(async () => {
      await Note.bulkCreate([
        { 
            title: 'JavaScript Tutorial', 
            content: 'Learn JavaScript fundamentals and advanced concepts' 
        },
        { 
            title: 'Python Guide', 
            content: 'Python programming for beginners' 
        }
      ]);
    });

    it('should search notes by title', async () => {
    const response = await request(app)
        .get('/api/notes/search?q=JavaScript')
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toContain('JavaScript');
    });

    it('should search notes by content', async () => {
    const response = await request(app)
        .get('/api/notes/search?q=programming')
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].content).toContain('programming');
    });

    it('should return 400 for missing search query', async () => {
    const response = await request(app)
        .get('/api/notes/search')   
        .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Search query is required');
    });
  });

  describe('PUT /api/notes/:id - Update Note', () => {
    let testNote;

    beforeEach(async () => {
      testNote = await Note.create({
         title: 'Original Title', 
         content: 'Original Content', 
         category: 'original' 
        });
    });

    it('should update a note with valid data', async () => {
    const updateData = { 
        title: 'Updated Title', 
        content: 'Updated Content', 
        category: 'updated',
        priority: 'high' 
    };

    const response = await request(app)
        .put(`/api/notes/${testNote.id}`)
        .send(updateData)
        .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe(updateData.title);
    expect(response.body.data.content).toBe(updateData.content);
    expect(response.body.data.category).toBe(updateData.category);
    expect(response.body.data.priority).toBe(updateData.priority);
    });

    it('should return 404 for non-existent note', async () => {
        const fakeId = '123e4567-e89b-12d3-a456-426614174000';
        const updateData={
            title: 'Updated Title',
            content: 'Updated Content'
        };
    
        const response = await request(app)
            .put(`/api/notes/${fakeId}`)
            .send({ title: 'Updated', content: 'Updated' })
            .expect(404);


    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Note not found');
    });
  });

describe('DELETE /api/notes/:id - Delete Note', () => {
    let testNote;

    beforeEach(async () => {
        testNote = await Note.create({ 
            title: 'Note to Delete', 
            content: 'This note will be deleted' 
        });
    });

    it('should delete an existing note', async () => {
      const response = await request(app)
        .delete(`/api/notes/${testNote.id}`)
        .expect(200);


    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Note deleted successfully');

    const deletedNote = await Note.findByPk(testNote.id);
    expect(deletedNote).toBeNull();
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
      .delete(`/api/notes/${fakeId}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/notes/:id/pin - Pin Functionality', () => {
    let testNote;

    beforeEach(async () => {
    testNote = await Note.create({ 
        title: 'Test Note', 
        content: 'Test Content', 
        isPinned: false 
        });
    });

    it('should toggle pin status', async () => {
    //Pin the note
    const response1 = await request(app)
        .patch(`/api/notes/${testNote.id}/pin`) 
        .expect(200);

    expect(response1.body.success).toBe(true);
    expect(response1.body.data.isPinned).toBe(true);
    expect(response1.body.message).toContain('pinned');

    //Unpin the note
    const response2 = await request(app)
        .patch(`/api/notes/${testNote.id}/pin`)
        .expect(200);
    expect(response2.body.data.isPinned).toBe(false);
    expect(response2.body.message).toContain('unpinned');
    });
  });
});
