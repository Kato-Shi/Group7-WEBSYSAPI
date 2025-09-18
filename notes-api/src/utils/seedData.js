const  Note  = require('../models/Note');

const sampleNotes = [
  {
    title: ' Welcome to Notes API',
    content: `This is your first note!! This API demonstrates modern backend development practices.
Features you can explore:
• Create and manage notes
• Search through content
• Organize with categories
• Pin important items
• Archive old content
Happy learning!! 🚀`,
    category: 'welcome',
    tags: ['getting-started', 'api', 'tutorial'],
    isPinned: true,
    priority: 'high'
  },
  {
    title: 'Project Meeting Notes',
    content: `Weekly project sync meeting notes:

Attendees: Development team, Product manager
Topics discussed:
- Sprint planning for next week
- API development progress
- Database optimization strategies
- Code review process improvements
Action items:
- Complete user authentication module
- Write comprehensive tests
- Update API documentation

Next meeting: Friday 2:00 PM`,
    category: 'work',
    tags: ['meeting', 'planning', 'project', 'team'],
    priority: 'medium'
  },
  {
    title: 'Shopping List',
    content: `Weekly grocery shopping:

Vegetables:
- Tomatoes
- Lettuce
- Carrots
- Bell peppers

Pantry items:
- Rice
- Pasta
- Olive oil
- Spices

Dairy:
- Milk
- Cheese
- Yogurt

Don't forget to check expiration dates!`,
    category: 'personal',
    tags: ['shopping', 'groceries', 'weekly'],
    priority: 'low'
  },
  {
    title: 'App Feature Ideas',
    content: `Brainstorming session for new app features:

User Experience:
- Dark mode toggle
- Keyboard shortcuts
- Drag and drop functionality
- Rich text editor

Technical Features:
- Real-time collaboration
- Offline synchronization
- Advanced search filters
- Export to PDF
- Voice-to-text input

Integration Ideas:
- Calendar synchronization
- Email notifications
- Mobile app companion
- Cloud backup`,
    category: 'creative',
    tags: ['brainstorming', 'features', 'development', 'ideas'],
    priority: 'medium'
  },
  {
    title: 'Learning Resources',
    content: `Curated list of learning resources for backend development:
Books:
- "Node.js Design Patterns" by Mario Casciaro
- "You Don't Know JS" series by Kyle Simpson
- "Clean Code" by Robert Martin

Online Courses:
- Node.js Complete Guide (Udemy)
- Express.js Fundamentals
- Database Design Principles

Documentation:
- Express.js official docs
- Sequelize documentation
- MDN Web Docs

Practice Projects:
- Todo API
- Blog platform
- E-commerce backend`,
    category: 'education',
    tags: ['learning', 'resources', 'books', 'courses'],
    priority: 'medium'
  },
  {
    title: 'Fitness Tracker',
    content: `Weekly fitness goals and progress:
This week's goals:
- Run 3 times (5km each)
- Gym sessions: 2 times
- Yoga: 1 session
Progress so far:
Monday: 5km run (25 minutes)
Tuesday: Gym session (upper body)
Wednesday: Rest day
Thursday: Planned yoga session
Friday: 5km run
Saturday: Gym session (lower body)
Sunday: Long run (8km)

Notes: Feeling stronger this week, improved running pace!!`,
    category: 'health',
    tags: ['fitness', 'goals', 'tracking', 'health'],
    priority: 'medium'
  },
  {
    title: 'Code Review Checklist',
    content: `Comprehensive code review checklist:
Code Quality:
- [ ] Functions are small and focused
- [ ] Variable names are descriptive
- [ ] No duplicate code
- [ ] Error handling is implemented

Security:
- [ ] Input validation is present
- [ ] No sensitive data in logs
- [ ] Authentication checks are in place

Performance:
- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Appropriate caching implemented

Testing:
- [ ] Unit tests cover new functionality
- [ ] Edge cases are tested
- [ ] Integration tests pass

Documentation:
- [ ] Code comments explain complex logic
- [ ] API documentation is updated
- [ ] README reflects changes`,
    category: 'work',
    tags: ['checklist', 'code-review', 'quality', 'best-practices'],
    priority: 'high'
  },
  {
    title: 'Movie Watchlist',
    content: `Movies to watch this month:
Action/Adventure:
- The Matrix (1999) - Classic sci-fi
- Mad Max: Fury Road (2015) - Modern masterpiece
- John Wick series - Stylish action

Drama:
- The Shawshank Redemption (1994) - Timeless classic
- Parasite (2019) - Oscar winner
- Moonlight (2016) - Beautiful storytelling
Sci-Fi:
- Blade Runner 2049 (2017) - Visual stunning
- Ex Machina (2014) - AI thriller
- Arrival (2016) - Thoughtful alien contact

TV Series:
- Breaking Bad - Crime drama
- The Office - Comedy
- Stranger Things - Supernatural`,
    category: 'entertainment',
    tags: ['movies', 'watchlist', 'entertainment', 'recommendations'],
    priority: 'low'
  },
  {
    title: 'Archive Test Note',
    content: `This note demonstrates the archive functionality.
Archived notes are:
- Hidden from default view
- Preserved for future reference
- Searchable when explicitly requested
- Easily restored when needed

Use archives to:
- Declutter your active notes
- Preserve historical information
- Maintain clean workspace
- Keep old projects accessible`,
    category: 'test',
    tags: ['archived', 'test', 'demonstration'],
    isArchived: true,
    priority: 'low'
  }
];

const seedNotes = async () => {
  try {
    // Clear existing notes
    await Note.destroy({ where: {} });
    console.log('Cleared existing notes');

    // Create sample notes
    const createdNotes = await Note.bulkCreate(sampleNotes);
    console.log(`Created ${createdNotes.length} sample notes`);

    // Log categories created
    const categories = [...new Set(sampleNotes.map(note => note.category))];
    console.log(`Categories: ${categories.join(', ')}`);

    return createdNotes;
  } catch (error) {
    console.error('Error seeding notes:', error.message);
    throw error;
  }
};

module.exports = { seedNotes, sampleNotes };
