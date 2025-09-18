const express = require('express');
const {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getNotesByCategory,
  togglePinNote,
  toggleArchiveNote,
  getCategories,
  searchNotes
} = require('../controllers/notesController');

const { validateNote, validateUUID } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Notes management endpoints
 */

//// Special routes (should come before parameterized routes)
router.get('/search', searchNotes);
router.get('/categories', getCategories);
router.get('/category/:category', getNotesByCategory);

//// Main CRUD routes
router.route('/')
  .get(getAllNotes) // GET /api/notes
  .post(validateNote, createNote); // POST /api/notes

router.route('/:id')
  .get(validateUUID, getNoteById) // GET /api/notes/:id
  .put(validateUUID, validateNote, updateNote) // PUT /api/notes/:id
  .delete(validateUUID, deleteNote); // DELETE /api/notes/:id

//// Special action routes
router.patch('/:id/pin', validateUUID, togglePinNote);
router.patch('/:id/archive', validateUUID, toggleArchiveNote);

module.exports = router;
