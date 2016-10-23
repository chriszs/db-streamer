var parse = require('url-parse');

module.exports = function(config) {
    // return a new inserter class
    var parsed;
    if (config.useSequelizeBulkInsert) {
        return require('./lib/inserters/sequelizeBulkInserter.js')(config);
    } else if (config.dbConnString) {
        parsed = parse(config.dbConnString);
    }
    switch (parsed.protocol) {
        case 'postgres:':
            return require('./lib/inserters/pgInserter.js')(config);
        default:
            return require('./lib/inserters/sequelizeBulkInserter.js')(config);
    }
};
