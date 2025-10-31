module.exports = (sequelize, DataTypes) => {
    return sequelize.define('tags', {
        discord_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        guild_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        iRacing_ID: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        display_license: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    }, {
        timestamps: false,
    });
};