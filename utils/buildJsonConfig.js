const db = require('../models');
const { QueryTypes } = require('sequelize');
const REAL_CONFIG = require('../config/config.json');

const recursive_build = (obj, key, value) => {
	const [first_key, ...rest_keys] = key.split('.');
	if (rest_keys && rest_keys.length) {
		if (!obj[first_key]) {
			obj[first_key] = {};
		}
		recursive_build(obj[first_key], rest_keys.join('.'), value);
	} else {
		obj[first_key] = value;
	}
};

const buildJsonConfig = async () => {
	try {
		const all_config_key_value_records = await db.sequelize.query(
			`SELECT * FROM config WHERE company_id != '0'`,
			{ type: QueryTypes.SELECT },
		);
		const final_obj = {};
		for (const record of all_config_key_value_records) {
			const company_id = record.company_id;
			if (!final_obj[company_id]) {
				final_obj[company_id] = {};
			}
			recursive_build(final_obj[company_id], record._key, record._value);
		}
		return Object.values(final_obj);
	} catch (e) {
		console.error(`ERROR IN buildJsonConfig. ${e}`);
		return REAL_CONFIG.MULTYCOMPANY;
	}
};

module.exports = { buildJsonConfig };
