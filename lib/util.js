var fs = require('fs'),
    moment = require('moment');

var util = {};

util.makeDateTime = function(d, driver) {
    return moment(d).toISOString();
};

util.makeBufferText = function(row, columns, driver) {

    var bufferTxt = '';

    var isArray = Array.isArray(row);

    for (var i = 0; i < columns.length; i++) {
        var k = columns[i];
        if (i !== 0) {
            bufferTxt += '\t';
        }
        bufferTxt += util.parseValue(k, row[isArray ? i : k], driver);
    }

    bufferTxt += '\n';

    return Buffer(bufferTxt);
};

util.parseValue = function(column, v, driver) {
    switch (column) {
        case 'created_date': // to do: these should be configurable
        case 'updated_date':
            return util.makeDateTime(new Date(), driver);
        default:
            if (typeof v === 'undefined' || v === null) {
                return 'NULL';
            }
            else if (v instanceof Date) {
                return util.makeDateTime(v, driver);
            }
            return v;
    }
};

module.exports = util;
