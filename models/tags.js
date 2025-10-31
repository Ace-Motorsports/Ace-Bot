module.exports = (sequelize, DataTypes) => {
    return sequelize.define('tags', {
        discord_id: {
            type: DataTypes.STRING,
            unique: 'compositeIndex'
        },
        guild_id: {
            type: DataTypes.STRING,
            unique: 'compositeIndex'
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
        timestamps: true,
    });
};