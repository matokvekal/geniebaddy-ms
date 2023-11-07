const db = require('../models');
const { QueryTypes } = require('sequelize');
const { getFixedValue } = require('./getFixedValue');

const create_google_api_log = async ({
	service,
	api,
	address,
	latitude,
	longitude,
	error,
	comment,
}) => {
	try {
		const SQL = `INSERT INTO log_google_api
	( 
		service,api,address,latitude,longitude,error,comment
	)
	VALUES
	(
		${getFixedValue(service)},
        ${getFixedValue(api)},
        ${getFixedValue(address)},
        ${getFixedValue(latitude)},
        ${getFixedValue(longitude)},
        ${getFixedValue(error)},
        ${getFixedValue(comment)}
	)`;
		await db.sequelize.query(SQL, { type: QueryTypes.INSERT });
	} catch (e) {
		console.error(`create_google_api_log err`, e);
	}
};

module.exports = { create_google_api_log };
