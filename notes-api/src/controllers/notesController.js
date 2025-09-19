const Note = require('../models/Note');
const { Op } = require('sequelize');

// Get all notes with advanced filtering
const getAllNotes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      archived = 'false',
      pinned,
      priority,
      sortBy = 'updatedAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Filter by archived status
    const archivedFilter = typeof archived === 'string' ? archived.toLowerCase() : archived;
    if (archivedFilter !== 'all') {
      whereClause.isArchived = archivedFilter === 'true';
    }

    // Filter by pinned status
    if (pinned !== undefined && pinned !== 'all') {
      whereClause.isPinned = pinned === 'true';
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      whereClause.priority = priority;
    }

    // Validate sort fields
    const allowedSortFields = ['title', 'createdAt', 'updatedAt', 'category', 'priority'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'updatedAt';

    // Execute query
    const { count, rows: notes } = await Note.findAndCountAll({
      where: whereClause,
      order: [
        ['isPinned', 'DESC'], // Pinned notes always first
        [sortField, sortOrder.toUpperCase()]
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: notes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single note by ID
const getNoteById = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new note
const createNote = async (req, res) => {
  try {
    const { title, content, category, tags, isPinned, priority } = req.body;
    const note = await Note.create({
      title,
      content,
      category: category || 'general',
      tags: tags || [],
      isPinned: isPinned || false,
      priority: priority || 'medium'
    });
    res.status(201).json({
      success: true,
      data: note,
      message: 'Note created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update an existing note
const updateNote = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    const { title, content, category, tags, isPinned, isArchived, priority } = req.body;

    await note.update({
      title,
      content,
      category,
      tags,
      isPinned,
      isArchived,
      priority
    });

    res.json({
      success: true,
      data: note,
      message: 'Note updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a note
const deleteNote = async (req, res) => {
  try {
    const deletedRowsCount = await Note.destroy({
      where: { id: req.params.id }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get notes by category
const getNotesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const notes = await Note.findAll({
      where: { category, isArchived: false },
      order: [
        ['isPinned', 'DESC'],
        ['updatedAt', 'DESC']
      ]
    });
    res.json({
      success: true,
      data: notes,
      category,
      count: notes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle pinned status
const togglePinNote = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    note.isPinned = !note.isPinned;
    await note.save();
    res.json({
      success: true,
      data: note,
      message: `Note ${note.isPinned ? 'pinned' : 'unpinned'} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle archive status
const toggleArchiveNote = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    note.isArchived = !note.isArchived;
    await note.save();
    res.json({
      success: true,
      data: note,
      message: `Note ${note.isArchived ? 'archived' : 'unarchived'} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all available categories
const getCategories = async (req, res) => {
  try {
    const categories = await Note.findAll({
      attributes: ['category'],
      group: ['category'],
      raw: true
    });
    const categoryList = categories.map(item => item.category);
    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Search notes by content
const searchNotes = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const notes = await Note.findAll({
  where: {
    [Op.or]: [
      { title: { [Op.like]: `%${q}%` } },  
      { content: { [Op.like]: `%${q}%` } }
    ]
  }
});

    res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
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
};
