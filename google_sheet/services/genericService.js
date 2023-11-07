module.exports = function (db) {
  return {
    deleteAll,
    addBulk,
    findAll,
  };

  function deleteAll(model, where) {
    return db[model].destroy({ where });
  }

  function addBulk(model, data, where) {
    return db[model].bulkCreate(data, { where });
  }

  function findAll(model, where) {
    return db[model].findAll({ where, raw: true, nest: true, });
  }
};
