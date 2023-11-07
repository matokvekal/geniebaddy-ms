import Sequelize from 'sequelize';
// import Logger from '../utils/Logger';
// import initDatabaseModels from './initDatabaseModels'

export default async (config) => {
	const sequelize = new Sequelize(
		config.database.NAME,
		config.database.USER,
		config.database.PASSWORD,
		{
			host: config.database.HOST,
			port: config.database.PORT,
			dialect: config.database.dialect,
			operatorsAliases: false,
			logging: false,// remove console.logs
			pool: {
				max: config.database.pool.max,
				min: config.database.pool.min,
				acquire: config.database.pool.acquire,
				idle: config.database.pool.idle,
			},
		}
	);

	const db = { sequelize };
	// const models = await initDatabaseModels(db);
	Object.assign(db);
	// Object.assign(db, models);

	// try {
	// 	await sequelize.authenticate();
	// 	Logger.info('Connection has been established successfully.');
	// } catch (error) {
	// 	Logger.error('Unable to connect to the database:', error);
	// }

	// Logger.debug('Finished initializing DB');

	return db;
};
