const admin = require('firebase-admin');
const cron = require('node-cron');
const { QueryTypes } = require('sequelize');
const CONFIG = require('../config/config.json');

const db = require('../models');
const firebaseConfig = require('./gf_firebase_config.json');

const fetchDataInterval = CONFIG.executeMobileNotifications;

const fbConnection = admin.initializeApp({
	credential: admin.credential.cert(firebaseConfig),
});

const sendFirebasePush = async (notification) => {
	const regToken = notification.fire_base_token;

	const message = {
		notification: {
			title: notification.message_title,
			body: notification.message_body,
		},
	};

	return admin.messaging().sendToDevice(regToken, message);
};

const fetchNotificationsForSending = async () => {
	try {
		const notifications = await db.sequelize.query(
			`SELECT * from mobile_notifications WHERE is_sent=0 AND last_date_to_send > now();`,
			{ type: QueryTypes.SELECT },
		);

		if (notifications.length > 0) {
			for (let index = 0; index < notifications.length; index++) {
				const currentNotification = notifications[index];
				await db.sequelize.query(
					`UPDATE mobile_notifications SET sent_time=now() WHERE id = ${currentNotification.id};`,
				);
				await sendFirebasePush(currentNotification)
					.then(async (res) => {
						if (res) {
							try {
								await db.sequelize.query(
									`UPDATE mobile_notifications SET is_sent=1,recived_time=now(), trys=${res.successCount} WHERE id = ${currentNotification.id};`,
								);
								if (
									currentNotification.planning_id &&
									currentNotification.send_to === 'driver'
								) {
									await db.sequelize.query(
										`UPDATE planning SET is_driver_recived =1 where  id = ${currentNotification.planning_id};`,
									);
								} else if (currentNotification.send_to === 'chaperone') {
									await db.sequelize.query(
										`UPDATE planning SET is_chaperone_recived =1 where  id = ${currentNotification.planning_id};`,
									);
								}
							} catch (err) {
								console.log('Error while updating mobile notifications: ', err);
							}
						}
					})
					.catch((err) => {
						console.log('ERROR IN sendFirebasePush: ', err);
					});
			}
		}
	} catch (e) {
		console.log(`ERROR at execute: `, e);
	}
};

if (fetchDataInterval) {
	cron.schedule(`*/${fetchDataInterval} * * * * *`, function () {
		try {
			console.log('Cron executed - ', new Date());
			fetchNotificationsForSending();
		} catch (e) {
			console.log(`ERROR at execute: `, e);
		}
	});
}

console.log(
	`Microservice for mobile notifications will fetch new data each ${fetchDataInterval} seconds`,
);
