//// Note validation middleware
const validateNote = (req, res, next) => {
  const { title, content, priority, tags, category } = req.body;

  //// Required fields validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required',
      received: req.body,
      hint: 'Make sure both title and content are provided'
    });
  }

  //// Type validation
  if (typeof title !== 'string' || typeof content !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Title and content must be strings'
    });
  }

  //// Empty string validation
  if (title.trim().length === 0 || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Title and content cannot be empty or only whitespace'
    });
  }

  //// Length validation
  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Title must be less than 200 characters',
      currentLength: title.length
    });
  }

  //// Priority validation
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({
      success: false,
      message: 'Priority must be one of: low, medium, high',
      received: priority
    });
  }

  //// Tags validation
  if (tags && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
    return res.status(400).json({
      success: false,
      message: 'Tags must be an array of strings',
      example: ['tag1', 'tag2', 'tag3']
    });
  }

  //// Category validation
  if (category && (typeof category !== 'string' || category.length > 50)) {
    return res.status(400).json({
      success: false,
      message: 'Category must be a string with less than 50 characters'
    });
  }

  next();
};

//// UUID validation middleware
const validateUUID = (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid note ID format',
      received: id,
      expected: 'UUID format (e.g., 112233ee-4455-6677-8899-aabbccddeeff)'
    });
  }

  next();
};

module.exports = { validateNote, validateUUID };
