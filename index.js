// jshint esnext:true

var parse = require('url-parse');

module.exports = config => {
    // return a new inserter class
    /*
    let parsed;
    
    if (config.useSequelizeBulkInsert) {
        return require('./lib/inserters/sequelizeBulkInserter.js')(config);
    }
    else if (config.dbConnString) {
        parsed = parse(config.dbConnString);
    }*/

    switch (config.sequelize.options.dialect) {
        case 'postgres':
            return require('./lib/inserters/pgInserter.js')(config);
        default:
            return require('./lib/inserters/sequelizeBulkInserter.js')(config);
    }
};
