module.exports = (sequelize, DataTypes) => {
	return sequelize.define('tags', {
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		discord_id: {
			type: DataTypes.STRING,
			unique: 'compositeIndex',
		},
		guild_id: {
			type: DataTypes.STRING,
			unique: 'compositeIndex',
		},
		iRacing_ID: {
			type: DataTypes.INTEGER,
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
