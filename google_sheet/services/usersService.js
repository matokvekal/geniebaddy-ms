const { Op } = require("sequelize");

module.exports = function (db) {
  return {
    deleteAllUsers,
    addAllUsersFromGoogleSheetToTable,
  };

  function deleteAllUsers(where) {
    return db.user.destroy({ where: where });
  }

  function addAllUsersFromGoogleSheetToTable(data, _where) {
    return db.user.bulkCreate(data, { where: _where });
  }
};
