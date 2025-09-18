const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Title cannot be empty',
      },
      len: {
        args: [1, 200],
        msg: 'Title must be between 1 and 200 characters',
      },
    },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Content cannot be empty',
      },
    },
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'general',
    validate: {
      len: {
        args: [0, 50],
        msg: 'Category must be less than 50 characters',
      },
    },
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    validate: {
      isArrayOfStrings(value) {
            if (value && !Array.isArray(value)) {
            throw new Error('Tags must be an array');
            }
            if (value && value.some(tag => typeof tag !== 'string')) {
            throw new Error('All tags must be strings');
            }
      },
    },
  },
  isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
  },
  isArchived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
  },
  priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
  },
}, {
    tableName: 'notes',
    timestamps: true,
    indexes: [
        { 
        fields: ['category'] 
        },
        {
        fields: ['isPinned']
        },
        { 
        fields: ['isArchived']
        },
        { 
        fields: ['priority'] 
        },
  ],
});

module.exports = Note;
