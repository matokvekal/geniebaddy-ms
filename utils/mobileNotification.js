const { QueryTypes } = require('sequelize');

exports.sendMobileNotification = async function ({
	company_id,
	userPhone,
	title,
	body,
	data,
}) {
	try {
		let fireBaseToken;
		if (company_id && userPhone && (title || body || data)) {
			fireBaseToken = await this.sequelize.query(
				`SELECT distinct fire_base_token FROM drivers WHERE phone_number = ${userPhone} and company_id= ${company_id}`,
				{ type: QueryTypes.SELECT }
			);
		} else {
			return 'information requierd';
		}

		if (fireBaseToken) {
			await this.sequelize.query(
				"INSERT INTO mobile_notifications (`company_id`,`phone_number`,`fire_base_token`,`message_title`,`message_body`,`planning_id`) VALUES ('" +
					company_id +
					"', '" +
					userPhone +
					"', '" +
					fireBaseToken +
					"', '" +
					title +
					"', '" +
					body +
					"', '" +
					data +
					"')"
			);
		} else {
			return 'No fireBaseToken';
		}
	} catch (e) {
		console.log('sendMobileNotification', e);
		return 'err sendMobileNotification';
	}
};
