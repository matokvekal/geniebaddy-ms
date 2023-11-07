const db = require('./../models');
const genericService = require('./services/genericService')(db);

//#region ACTIONS before and after googlesheet
// const insert_stations_from_route_to_trip = async ({ company_id }) => {
//   await db.sequelize.query(`call insert_stations_from_route_to_trip(${company_id})`);
// }

const update_scopes_before_inserting = async ({ dataToDB }) => {
	return dataToDB.map((item) => {
		if (item.scopes && item.scopes.includes(',')) {
			return {
				...item,
				scopes: item.scopes.split(',')[0],
			};
		}
		return { ...item };
	});
};

const filter_drivers_before_insert = async ({ dataToDB, company_id }) => {
	const driversInDB = await genericService.findAll('drivers', {
		company_id: +company_id,
	});
	const usersInDB = await genericService.findAll('user', {
		company_id: +company_id,
	});
	const dirversToAdd = [];
	dataToDB.forEach((driverItem) => {
		if (
			driverItem.phone_number &&
			!dirversToAdd.find(
				(d) => d.phone_number === driverItem.phone_number
			) &&
			!driversInDB.find((d) =>
				d.phone_number.includes(driverItem.phone_number)
			)
		) {
			dirversToAdd.push(driverItem);
		}
	});
	const driverUsersToAdd = dirversToAdd
		.filter(
			(d) => !usersInDB.find((u) => u.user_name.includes(d.phone_number))
		)
		.map((d) => {
			return {
				company_id: +company_id,
				user_name: d.phone_number,
				first_name: d.first_name,
				last_name: d.last_name,
				user_role: 'driver',
				is_active: 1,
				zones: d.scopes,
			};
		});
	await genericService.addBulk('user', driverUsersToAdd);
	return dirversToAdd;
};
//#endregion

const actionsToDoBefore = {
	user: {
		insert: [],
		delete: [],
	},
	drivers: {
		insert: [update_scopes_before_inserting, filter_drivers_before_insert],
		delete: [],
	},
	vehicles: {
		insert: [update_scopes_before_inserting],
		delete: [],
	},
	stations: {
		insert: [],
		delete: [],
	},
	points_of_interest: {
		insert: [],
		delete: [],
	},
	chaperones: {
		insert: [update_scopes_before_inserting],
		delete: [],
	},
	customers: {
		insert: [],
		delete: [],
	},
};

const actionsToDoAfter = {
	user: {
		insert: [],
		delete: [],
	},
	drivers: {
		insert: [],
		delete: [],
	},
	vehicles: {
		insert: [],
		delete: [],
	},
	stations: {
		insert: [],
		delete: [],
	},
	points_of_interest: {
		insert: [],
		delete: [],
	},
	chaperones: {
		insert: [],
		delete: [],
	},
	customers: {
		insert: [],
		delete: [],
	},
};

const activateAction = async (arrayOfActions, paramsObject) => {
	try {
		let dataToDB = paramsObject.dataToDB;
		if (arrayOfActions && arrayOfActions.length) {
			for (let actionToDo of arrayOfActions) {
				dataToDB = await actionToDo({ ...paramsObject, dataToDB });
			}
		}
		return dataToDB;
	} catch (err) {
		throw err;
	}
};

/**
 *
 * @param {*} actionsObject actionsToDoAfter or actionsToDoBefore
 * @param {*} dbModel the fey from the dictionaries
 * @param {*} type 'insert' or 'delete' or future types
 * @param {*} paramsObject object with all the params for all the actions,
 *  each action will take only what it needs from the object
 */
const activateActionForModel = async (
	actionsObject,
	dbModel,
	type,
	paramsObject
) => {
	try {
		if (actionsObject[dbModel] && actionsObject[dbModel][type]) {
			return await activateAction(
				actionsObject[dbModel][type],
				paramsObject
			);
		}
		return null;
	} catch (actionErr) {
		throw `ERROR during action after ${type} - ${actionErr}`;
	}
};

/**
 *
 * @param {*} dbModel the fey from the dictionaries
 * @param {*} type 'insert' or 'delete' or future types
 * @param {*} paramsObject object with all the params for all the actions,
 *  each action will take only what it needs from the object
 */
const callActionsBefore = async (dbModel, type, paramsObject) => {
	try {
		return activateActionForModel(
			actionsToDoBefore,
			dbModel,
			type,
			paramsObject
		);
	} catch (actionErr) {
		throw actionErr;
	}
};

/**
 *
 * @param {*} dbModel the fey from the dictionaries
 * @param {*} type 'insert' or 'delete' or future types
 * @param {*} paramsObject object with all the params for all the actions,
 *  each action will take only what it needs from the object
 */
const callActionsAfter = async (dbModel, type, paramsObject) => {
	try {
		return activateActionForModel(
			actionsToDoAfter,
			dbModel,
			type,
			paramsObject
		);
	} catch (actionErr) {
		throw actionErr;
	}
};

module.exports = { callActionsBefore, callActionsAfter };
