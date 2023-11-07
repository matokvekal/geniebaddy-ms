const cron = require('node-cron');
const { QueryTypes } = require('sequelize');
const config = require('../config');
const axios = require('axios');
const db = require('./../models');
const executeMinutesParam = 2;

let cronTask;
let cronExecuteFormat;

cronExecuteFormat = `*/${executeMinutesParam} * * * *`; // EVERY X MINUTES
console.log(`Cron will be executed every ${cronExecuteFormat} MINUTES`);

run();
cronTask = cron.schedule(cronExecuteFormat, function () {
	try {
		run();
	} catch (e) {
		console.log(`e`, e);
	}
});

async function run() {
	try {
		console.log(`START sms sender`);

		let sms = await db.sequelize.query(`SELECT * FROM sms WHERE is_sent = 0`, {
			type: QueryTypes.SELECT,
		});

		for (let i = 0; i < sms.length; i++) {
			if (sms[i].phone_number && sms[i].text) {
				const result = await sendSms([sms[i].phone_number], sms[i].text);

				if (result) {
					await db.sequelize.query(
						`UPDATE sms SET is_sent = 1,sent_time=now() WHERE id = ${sms[i].id}`,
						{ type: QueryTypes.SELECT },
					);
				}
			}
		}

		console.log(`END sms sender`);
	} catch (e) {
		console.log(e);
		console.log(`error - Check sms sender`);
	}
}

const sendSms = async (phoneNumbersToSendTo = [], messageBody) => {
	try {
		const siteID = config.smsSiteID;
		const password = config.smsSitePassword;
		const tokenResult = await axios.post(
			'http://gconvertrest.sendmsg.co.il/api/sendMsg/token?full=true',
			{
				siteID,
				password,
			},
		);
		const { Token, Active } = tokenResult.data.ActiveToken;
		if (Token && Active) {
			const SenderPhone = config.smsSenderPhone;
			const MessageInnerName = config.smsMessageInnerName;
			const Users = phoneNumbersToSendTo.map((phoneNumber) => {
				return { Cellphone: phoneNumber };
			});
			const sendSmsResult = await axios.post(
				'https://gconvertrest.sendmsg.co.il/api/Sendmsg/AddUsersAndSendSMS',
				{
					Users,
					Message: {
						MessageContent: messageBody,
						SenderPhone,
						MessageInnerName,
						MessageSubject: '',
						MessageType: 1,
						TypeSms: 2, // 1 is short sms  2-long
					},
				},
				{
					headers: {
						Authorization: Token,
					},
				},
			);
			const { success } = sendSmsResult.data;
			//return success;
			return true; //todo fix sms
		}
		return false;
	} catch (err) {
		console.error(err);
		return false;
	}
};
