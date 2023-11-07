const { Op } = require('sequelize');
const moment = require('moment');

module.exports = function () {
	return {
		updateResourceCarSize,
		setControlCronRunning,
		checkControlCronRunning,
	};







	async function setControlCronRunning(cronName, isRunning) {
		try {

			let controlExisting = await controlService.getControl({
				key: cronName,
			});

			if (controlExisting === null) {
				await controlService.addControl({
					key: cronName,
					value: isRunning,
					started_on: new Date(),
				});
			} else {
				if (isRunning) {
					await controlService.updateControl(
						{ value: isRunning, started_on: new Date() },
						{ key: cronName },
					);
				} else {
					await controlService.updateControl(
						{ value: isRunning },
						{ key: cronName },
					);
				}
			}
			// }
		} catch (e) {
			console.log(`e`, e);
		}
	}

	async function checkControlCronRunning(cronName) {
		try {
			let controlExisting;

			if (cronName === configEtl) {
				controlExisting = await controlService.getControl({
					key: cronName,
					value: 1,
					started_on: {
						[Op.gte]: moment().subtract(10, 'minutes').toDate(),
					},
				});
			} else {
				controlExisting = await controlService.getControl({
					key: cronName,
					value: 1,
				});
			}
			if (controlExisting === null) {
				await this.setControlCronRunning(cronName, false);
				return false;
			} else {
				return true;
			}
		} catch (err) {
			console.log(`ERR IN checkControlCronRunning - ${err}`);
			return true;
		}
	}
};
