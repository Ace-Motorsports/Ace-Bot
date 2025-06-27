const { Sequelize } = require('sequelize'); 

const sequelize = new Sequelize('userdb', 'username', 'password', {
	host: './db.sqlite',
	dialect: 'sqlite'
});

const Tags = sequelize.define('tags', {
    discord_id: {
        type: Sequelize.TEXT,
        primaryKey: true
    },
    iRacing_ID: {
        type: Sequelize.TEXT,
        allowNull: false
    }
}, {
    timestamps: false
});

module.exports = {
    sequelize,
    Tags
};
