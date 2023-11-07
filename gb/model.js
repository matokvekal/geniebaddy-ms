

const dbConfig = require('../config/index').database;

const Sequelize = require('sequelize');
const sequelize = new Sequelize(dbConfig.DB, dbConfig.user, dbConfig.password, {
	host: dbConfig.host,
	dialect: dbConfig.dialect,
	dialectOptions: {
		multipleStatements: true,
	},
	operatorsAliases: 0,
	logging: false, // remove console.logs

	pool: {
		max: dbConfig.pool.max,
		min: dbConfig.pool.min,
		acquire: dbConfig.pool.acquire,
		idle: dbConfig.pool.idle,
	},
});

const dbs = {};

dbs.Sequelize = Sequelize;
dbs.sequelize = sequelize;



Object.keys(dbs).forEach((modelName) => {
	if (dbs[modelName].associate) {
		dbs[modelName].associate(dbs);
	}
});

module.exports = dbs;
