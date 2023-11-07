const express = require('express');
const { google } = require('googleapis');
const db = require('./../models');
const config = require('../config/config.json');
const genericService = require('./services/genericService')(db);

const { Op } = require('sequelize');

const { callActionsBefore, callActionsAfter } = require('./actions');
const { buildJsonConfig } = require('../utils/buildJsonConfig');

// const logger = require('../logger');
const port = 8080;

const app = express();

//db:googlesheet
const modelsDictionary = config.googleSheetDictionary;

// fields that are not here, will be used as is in the google sheet
const fieldsWithDifferentNames = {
	user: {},
	drivers: {
		DisplayName: 'nick_name', // FOR NOW: this is just for testing the logic, you can change the name of the english fields in the google sheet
	},
	vehicles: {},
	stations: {},
	points_of_interest: {},
	chaperones: {},
	customers: {},
};

const addDataFromGoogleSheetToDb = async (companyKey, googleSheetModel) => {
	try {
		const companies_config_array = await buildJsonConfig();
		const company = companies_config_array.find(
			(companyObject) => companyObject.COMPANY_KEY === companyKey,
		);
		const company_id = company ? company.COMPANY_ID : null;
		if (company && company_id) {
			const where = { company_id: +company_id };
			let dataToDB = [];
			// connect google service with application
			const auth = new google.auth.GoogleAuth({
				keyFile: `google_config_${company_id}.json`,
				scopes: 'https://www.googleapis.com/auth/spreadsheets',
			});
			const client = await auth.getClient();

			const googleSheets = google.sheets({ version: 'v4', auth: client }); // Instance of Google Sheets API

			const spreadsheetId = company.GOOGLE_SHEET_ID; // value from url of google sheet

			/*
      // In case some metadata about sheet is needed
    
      const metaData = await googleSheets.spreadsheets.get({
        auth,
        spreadsheetId,
      });
      */

			// get data from google sheet
			const getRows = await googleSheets.spreadsheets.values.get({
				auth,
				spreadsheetId,
				range: googleSheetModel, // NB must match exactly with sheet name in used Google Sheet
			});

			if (getRows && getRows.data && getRows.data.values) {
				const tableKeys = getRows.data.values[0]; // arr of strings(representing keys)
				// It is 2, because of hebrew columns names row
				const dataFromSheet = getRows.data.values.slice(2); // arr of arr of strings(representing values)

				const dbModel = modelsDictionary[googleSheetModel];
				if (dbModel) {
					dataFromSheet.forEach((arrOfValues) => {
						const record = {};
						arrOfValues.forEach((value, index) => {
							// Either it is a our custom field name or the name in the google sheet
							const recordKey =
								(fieldsWithDifferentNames[dbModel] &&
									fieldsWithDifferentNames[dbModel][tableKeys[index]]) ||
								tableKeys[index];
							record[recordKey] = value;
						});
						record.company_id = company_id;
						dataToDB.push(record);
					});
					if (dataToDB.length > 0) {
						try {
							// return { dbModel, company_id, dataToDB };
							const updatedDataToDB = await callActionsBefore(
								dbModel,
								'insert',
								{ company_id, dataToDB },
							);
							dataToDB = updatedDataToDB || dataToDB;
							const result = await genericService.addBulk(
								dbModel,
								dataToDB,
								where,
							);
							await callActionsAfter(dbModel, 'insert', {
								company_id,
							});
							return `Successfully inserted data from Google sheet for: ${dbModel} for company: ${company_id} - ${result.length}`;
						} catch (err) {
							console.log(`ERROR during inserting: ${err}`);
							throw `ERROR during inserting check for :wrong googleSheet or Duplicate items or missing parts`;
						}
					}
					throw `ERROR - NO DATA TO INSERT TO THE DATA BASE`;
				}
				throw `ERROR  - COULD NOT FIND DB MODEL`;
			}
			throw 'ERROR IN GOOGLE SHEET API!!!';
		}
		throw `ERROR - COULD NOT FIND YOUR COMPANY `;
	} catch (err) {
		console.log(`ERROR : ${err}`);
		throw `ERROR`;
	}
};

const deleteTable = async (companyKey, googleSheetModel) => {
	try {
		const companies_config_array = await buildJsonConfig();
		const company = companies_config_array.find(
			(companyObject) => companyObject.COMPANY_KEY === companyKey,
		);
		const company_id = company ? company.COMPANY_ID : null;
		const dbModel = modelsDictionary[googleSheetModel];
		if (company_id && dbModel) {
			const where = {
				company_id: +company_id,
				[Op.or]: [{ admin: 0 }, { admin: null }],
			};
			try {
				await callActionsBefore(dbModel, 'delete', { company_id });
				const result = await genericService.deleteAll(dbModel, where);
				await callActionsAfter(dbModel, 'delete', { company_id });
				return `Successfully deleted table: ${dbModel}`;
			} catch (err) {
				console.log(`ERROR during deleteAll: ${err}`);
				throw `ERROR during deleting `;
			}
		}
		throw `ERROR - COULD NOT FIND COMPANY OR DB  `;
	} catch (err) {
		console.log(`ERROR : ${err}`);
		throw `ERROR`;
	}
};

// fields that are in the googlesheet - MUST BE IN EXACT ORDER
const fieldsFromDbForUpdatingGoogleSheet = {
	user: ['user_name', 'permission_id', 'first_name', 'last_name', 'zones'],
	routes_stations: [
		'route_name',
		'course_code',
		'station_index',
		'latitude',
		'longitude',
	],
	drivers: [
		'driver_code',
		'first_name',
		'last_name',
		'scopes',
		'DisplayName',
		'phone_number',
		'languages',
		'family',
	],
	vehicles: ['car_number', 'seats', 'scope', 'icon_size'],
	stations: [],
	points_of_interest: [],
	chaperones: ['first_name', 'last_name', 'nick_name', 'phone_number'],
	customers: ['id', 'name', 'classification'],
};

const addToSheetFromDb = async (companyKey, googleSheetModel) => {
	try {
		const companies_config_array = await buildJsonConfig();
		const company = companies_config_array.find(
			(companyObject) => companyObject.COMPANY_KEY === companyKey,
		);
		const company_id = company ? company.COMPANY_ID : null;
		const dbModel = modelsDictionary[googleSheetModel];
		if (company_id && dbModel) {
			const where = { company_id, admin: 0 };
			const dataFromDb = await genericService.findAll(dbModel, where);
			if (dataFromDb && dataFromDb.length) {
				const auth = new google.auth.GoogleAuth({
					keyFile: `google_config_${company_id}.json`,
					scopes: 'https://www.googleapis.com/auth/spreadsheets',
				});
				const client = await auth.getClient();
				const googleSheets = google.sheets({
					version: 'v4',
					auth: client,
				}); // Instance of Google Sheets API
				const spreadsheetId = company.GOOGLE_SHEET_ID;

				const getRows = await googleSheets.spreadsheets.values.get({
					auth,
					spreadsheetId,
					range: googleSheetModel, // NB must match exactly with sheet name in used Google Sheet
				});
				if (getRows && getRows.data && getRows.data.values) {
					const dataFromSheet = getRows.data.values.slice(2); // arr of arr of strings(representing values)
					const length = dataFromSheet.length;
					const rangeStartPoint = `B${3 + length}`; // NOTICE THIS IN THE GOOGLE-SHEETS => all data starts from B3
					const range = `${googleSheetModel}!${rangeStartPoint}`;

					if (
						fieldsFromDbForUpdatingGoogleSheet[dbModel] &&
						fieldsFromDbForUpdatingGoogleSheet[dbModel].length > 0
					) {
						const values = dataFromDb.map((item) => {
							const valueRow = [];
							fieldsFromDbForUpdatingGoogleSheet[dbModel].forEach((key) => {
								valueRow.push(item[key]);
							});
							return valueRow;
						});
						const body = {
							values: values,
						};

						return new Promise((resolve, reject) => {
							googleSheets.spreadsheets.values
								.update({
									valueInputOption: 'RAW',
									spreadsheetId: spreadsheetId,
									range: range,
									resource: body,
								})
								.then((response) => {
									const result = response.data;
									if (result) {
										resolve(
											`Successfully updated Google sheet form DB for: ${dbModel} for company: ${company_id} - ${result.updatedRows}`,
										);
									}
									reject(`ERROR IN GOOGLE SHEET API!!! - ${response}`);
								})
								.catch((error) => {
									reject(`ERROR IN GOOGLE SHEET API!!! - ${error}`);
								});
						});
					}
					throw `ERROR no fields to take for model`;
				}
				throw 'ERROR IN GETTING DATA FROM GOOGLE SHEET API!!!';
			}
			throw `No relevant data`;
		}
		throw `ERROR - COULD NOT FIND COMPANY OR DB MODEL`;
	} catch (err) {
		console.log(`ERROR : ${err}`);
		throw `ERROR check for duplicate username or other wrong data`;
	}
};

// EXAMPLE - /asbdhsbdhsllkdu/insert/users
app.get('/:companyKey/insert/:googleSheetModel', async (req, res) => {
	try {
		const result = await addDataFromGoogleSheetToDb(
			req.params.companyKey,
			req.params.googleSheetModel,
		);
		res.status(200).send(result);
	} catch (err) {
		console.log(err);
		res.status(400).send({ message: err });
	}
});

// EXAMPLE - /asbdhsbdhsllkdu/delete/users
app.get('/:companyKey/delete/:googleSheetModel', async (req, res) => {
	try {
		const result = await deleteTable(
			req.params.companyKey,
			req.params.googleSheetModel,
		);
		res.status(200).send(result);
	} catch (err) {
		console.log(err);
		res.status(400).send({ message: err });
	}
});

// EXAMPLE - /asbdhsbdhsllkdu/addToSheetFromDb/users
app.get('/:companyKey/addToSheetFromDb/:googleSheetModel', async (req, res) => {
	try {
		const result = await addToSheetFromDb(
			req.params.companyKey,
			req.params.googleSheetModel,
		);
		res.status(200).send(result);
	} catch (err) {
		console.log(err);
		res.status(400).send({ message: err });
	}
});

console.log(`Microservice Google sheet listen on port: ${port}`);
app.listen(port);
