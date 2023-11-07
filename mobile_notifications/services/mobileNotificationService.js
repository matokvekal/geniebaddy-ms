// const FirebaseMessaging = require("../third-party-services/google-services/firebase-services/messaging");
// const NotificationDBServices = require("../../database-services/notification");
// // const utilities = require('../../helpers/utility');
// // const SharedDBServices = require('../../database-services/shared');
// // const entityTypes = require('../../entities/enums/entity-types');

// /**
//  * This section contains all the notifications related services provided to all users of the system.
//  */
// module.exports = {
//   sendNotificationByMapping: async (
//     notificationDefinition,
//     recipientUsers,
//     userType,
//     { notificationData, saveEntity = true, sendToAdmins = false }
//   ) => {
//     let recipients = recipientUsers;

//     // TODO - Refactor into a non-volatile function, too many clashing options
//     if (sendToAdmins) {
//       recipients = await SharedDBServices.getEntityList(entityTypes.Admin, 0, {
//         skipPagination: true,
//         select: "+firebaseToken",
//         filter: { firebaseToken: { $ne: null } },
//       });
//     }

//     try {
//       if (Array.isArray(recipients)) {
//         if (saveEntity) {
//           const notifications = recipients.map((user) => {
//             return {
//               recipient: user,
//               title: notificationDefinition.title, // title, body, type, category
//               body: notificationDefinition.body, //
//               type: notificationDefinition.data.code,
//               ...(notificationDefinition.category && {
//                 category: notificationDefinition.category, //
//               }),
//               ...(notificationData && { data: notificationData }),
//             };
//           });

//           await NotificationDBServices.createManyNotifications(notifications);
//         }

//         // Firebase's Multicast function only supports up to 500 token per call...
//         let userChunks = [];

//         for (let i = 0; i < recipients.length; i += 500)
//           userChunks.push(recipients.slice(i, i + 500));

//         userChunks.forEach((userChunk) => {
//           const tokens = userChunk
//             .map((user) => user.firebaseToken)
//             .filter((token) => !!token); // Reduce the users to their firebase tokens, if they have one

//           if (tokens.length > 0) {
//             FirebaseMessaging.sendManyMessages(
//               userType,
//               userChunk
//                 .map((user) => user.firebaseToken)
//                 .filter((token) => !!token),
//               notificationDefinition.title,
//               notificationDefinition.body,
//               null,
//               { ...notificationDefinition.data, ...notificationData }
//             ).then();
//           }
//         });
//       } else {
//         if (saveEntity) {
//           await NotificationDBServices.createManyNotifications({
//             recipient: recipients._id,
//             title: notificationDefinition.title,
//             body: notificationDefinition.body,
//             type: notificationDefinition.data.code,
//             ...(notificationDefinition.category && {
//               category: notificationDefinition.category,
//             }),
//             ...(notificationData && { data: notificationData }),
//           });
//         }

//         if (recipients.firebaseToken) {
//           await FirebaseMessaging.sendSingleMessage(
//             userType,
//             recipients.firebaseToken,
//             notificationDefinition.title,
//             notificationDefinition.body,
//             null,
//             { ...notificationDefinition.data, ...notificationData }
//           );
//         }
//       }
//     } catch (err) {
//       console.log("Error: ", err);
//       // utilities.notifyDevelopers('An unexpected error has occurred while sending push notifications', err);
//     }
//   },
// };

// // [15:47, 1/10/2022] +972 54-228-8530: https://firebase.google.com/products/cloud-messaging

// // //// firebase send Message function for backend:
// // sendSingleMessage: async function (userType, token, title, body, image, data) {
// //     const app = await getApp(userType);

// //     try {
// //         let message = {
// //             token: token,
// //             notification: {
// //                 title: title,
// //                 body: body
// //             }
// //         };

// //         if (image)
// //             message.notification.image = image;

// //         if (data)
// //             message.data = data;

// //         await app.messaging().send(message);
// //     } catch (err) {
// //         utilities.notifyDevelopers('An unexpected error has occurred with FCM', err);
// //         // An error is not thrown to the user as Push notifications are determined as not vital to core functionality logic
// //     }
// // },

// // /**
// //  * Sends a Firebase cloud message to multiple devices.
// //  * Firebase's sendMulticast is limited to 500 calls. So the function should be called per chunks of devices.
// //  */
// // sendManyMessages: async function (userType, tokens, title, body, image, data) {
// //     const app = await getApp(userType);

// //     try {
// //         const message = {
// //             notification: {
// //                 title: title,
// //                 body: body
// //             },
// //             tokens: tokens
// //         };

// //         if (image)
// //             message.notification.image = image;

// //         if (data)
// //             message.data = data;

// //         await app.messaging().sendMulticast(message);
// //     } catch (err) {
// //         utilities.notifyDevelopers('An unexpected error has occurred with FCM', err);
// //     }
// // }

// // };

// //// firebase send Message function for backend:
// // sendSingleMessage: async function (userType, token, title, body, image, data) {
// //     const app = await getApp(userType);

// //     try {
// //         let message = {
// //             token: token,
// //             notification: {
// //                 title: title,
// //                 body: body
// //             }
// //         };

// //         if (image)
// //             message.notification.image = image;

// //         if (data)
// //             message.data = data;

// //         await app.messaging().send(message);
// //     } catch (err) {
// //         utilities.notifyDevelopers('An unexpected error has occurred with FCM', err);
// //         // An error is not thrown to the user as Push notifications are determined as not vital to core functionality logic
// //     }
// // },

// /**
//  * Sends a Firebase cloud message to multiple devices.
//  * Firebase's sendMulticast is limited to 500 calls. So the function should be called per chunks of devices.
//  */
// // sendManyMessages: async function (userType, tokens, title, body, image, data) {
// //     const app = await getApp(userType);

// //     try {
// //         const message = {
// //             notification: {
// //                 title: title,
// //                 body: body
// //             },
// //             tokens: tokens
// //         };

// //         if (image)
// //             message.notification.image = image;

// //         if (data)
// //             message.data = data;

// //         await app.messaging().sendMulticast(message);
// //     } catch (err) {
// //         utilities.notifyDevelopers('An unexpected error has occurred with FCM', err);
// //     }
// // }

// // };

// // getClientApp: async () => {
// //     if (clientApp)
// //         return clientApp;

// //     // This is to spare unnecessary calls to Google's API during development.
// //     if (process.env.NODE_ENV !== 'localhost' || process.env.GOOGLE_USE_GSM === 'true') {
// //         assert.ok(process.env.FIREBASE_CLIENT_SERVICE_ACCOUNT_SECRET_NAME, 'Error starting up server, configurations are missing.');

// //         let result = await secretManager.getSecret(process.env.FIREBASE_CLIENT_SERVICE_ACCOUNT_SECRET_NAME);

// //         assert.ok(result, 'Error starting up server, configurations are missing.');

// //         clientApp = admin.initializeApp({
// //             credential: admin.credential.cert(JSON.parse(result.toString('utf-8')))
// //         }, 'clientApp');
// //     } else {
// //         const clientAppConfig = JSON.parse(fs.readFileSync('client-service-account-key.json'));

// //         assert.ok(clientAppConfig, 'Error starting up server, configurations are missing.');

// //         clientApp = admin.initializeApp({
// //             credential: admin.credential.cert(clientAppConfig)
// //         }, 'clientApp');
// //     }

// //     return clientApp;
// // },

// // [13:47, 1/11/2022] +972 54-477-7693: const admin = require('firebase-admin');
// // [13:47, 1/11/2022] +972 54-477-7693: const secretManager = require('../secret-manager');
// // [13:48, 1/11/2022] +972 54-477-7693: const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

// // const client = new SecretManagerServiceClient({
// // 	credentials: {
// // 		private_key: process.env.GOOGLE_BACKEND_PROJ_CREDS_PRIVATE_KEY,
// // 		client_email: process.env.GOOGLE_BACKEND_PROJ_CREDS_EMAIL
// // 	},
// // 	projectId: process.env.GOOGLE_BACKEND_PROJ_ID
// // });

// // module.exports = {
// // 	getSecret: async (name) => {
// // 		const [version] = await client.accessSecretVersion({
// // 			name: name
// // 		});

// // 		return version.payload.data;
// // 	}

// // };
