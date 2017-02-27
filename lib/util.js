// jshint esnext:true

const fs = require('fs'),
      moment = require('moment');

const util = {};

util.makeDateTime = (d, driver) => moment(d).toISOString();

util.makeBufferText = (row, columns, driver) => {
    let bufferTxt = '';

    const isArray = Array.isArray(row);

    for (let i = 0; i < columns.length; i++) {
        const k = columns[i];
        if (i !== 0) {
            bufferTxt += '\t';
        }
        bufferTxt += util.parseValue(k, row[isArray ? i : k], driver);
    }

    bufferTxt += '\n';

    return Buffer(bufferTxt);
};

util.parseValue = (column, v, driver) => {
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
            else if (typeof v === 'string') {
                return v.replace(/\\/g,'\\\\')
                        .replace(/\n/g,'\\\n')
                        .replace(/\t/g,'\\\t');
            }
            return v;
    }
};

module.exports = util;
