const {Note} = require('../models')
const {sequelize} = require('../config/database');

const getNoteStats = async (req, res) => {
    try {
        const [totalNotes] = await Promise.all([
            Note.count(),
            Note.count({where:{isPinned: true} }),
            Note.count({where: {isArchived: true}})
        ]);

        const categoryCounts = await Note.findAll({
            attributes: [
                'category',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['category'],
            raw: true
        });

        const priorityCounts = await Note.findAll({
            attributes: [
                'priority',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['priority'],
            raw: true
        });

        res.json({
            success: true,
            data: {
                overview: {
                    total: totalNotes,
                    pinned: pinnedNotes,
                    archived: archivedNotes,
                    active:total - archivedNotes
            },
                categories: categoryCounts,
                priorities: priorityCounts
                }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {getNoteStats};