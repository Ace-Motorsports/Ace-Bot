module.exports = (sequelize, DataTypes) => {
    return sequelize.define('guild_settings', {
        guild_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        temp_channel_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        temp_category_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        timestamps: false,
    });
};