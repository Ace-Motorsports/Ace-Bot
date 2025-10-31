const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'db.sqlite',
});

const Tags = require('./models/tags.js')(sequelize, Sequelize.DataTypes);
const GuildSettings = require('./models/guild_settings.js')(sequelize, Sequelize.DataTypes);

module.exports = { sequelize, Tags, GuildSettings };