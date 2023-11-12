const moment = require('moment');
const db = require('../models');
const { QueryTypes } = require('sequelize');
// const CONFIG = require('../config/config.json');

const fixString = (value) => {
	const regex = /[']/g;
	const back_slash_regex = /\\/g;
	return value !== null && value !== undefined
		? value.toString().replace(back_slash_regex, '').replace(regex, "\\'")
		: null;
};

const getFixedValue = (value) => {
	const regex = /[']/g;
	const back_slash_regex = /\\/g;
	const valueType = typeof value;
	const returnValue =
		value !== null &&
		value !== undefined &&
		value !== 'null' &&
		value !== 'undefined'
			? `'${(valueType === 'object'
					? moment(value).format('YYYY-MM-DD HH:mm:ss')
					: value.toString()
			  )
					.replace(back_slash_regex, '')
					.replace(regex, "\\'")}'`
			: `null`;
	return returnValue;
};

const getFixedValueSpace = (value) => {
	const regex = /[']/g;
	const valueType = typeof value;
	const returnValue =
		value !== null && value !== undefined
			? `'${(valueType === 'object'
					? moment(value).format('YYYY-MM-DD HH:mm:ss')
					: value.toString().replace('\r\n', '').trim()
			  ).replace(regex, "\\'")}'`
			: `""`;
	return returnValue;
};

module.exports = {
	fixString,
	getFixedValue,
	getFixedValueSpace,
};
