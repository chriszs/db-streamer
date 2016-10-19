var fs = require('fs');

var moment = require('moment');

var util = {};

util.makeDateTime = function(d, driver) {
    d = d ? moment(d) : moment();
    if (driver == 'mysql') {
        return d.format('YYYY-MM-DDTHH:mm:ss');
    } else {
        return d.toISOString();
    }
};

util.makeBufferText = function(row, columns, driver) {

    var bufferTxt = '',
        init = false;

    for (var i = 0; i < columns.length; i++) {
        var k = columns[i];
        if (!init) {
            init = true;
        } else {
            bufferTxt += '\t';
        }
        bufferTxt += util.parseValue(k, row[k], driver);
    }

    bufferTxt += '\n';

    return Buffer(bufferTxt);
};

util.parseValue = function(column, v, driver) {
    switch (column) {
        case 'createdAt':
        case 'updatedAt':
            return util.makeDateTime(null, driver);
        default:
            if (v === undefined || v === null) {
                return 'NULL';
            } else if (v instanceof Date) {
                return util.makeDateTime(v, driver);
            } else {
                return v;
            }
    }
};

module.exports = util;
