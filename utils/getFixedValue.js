const moment = require('moment');

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

module.exports = { getFixedValue };
