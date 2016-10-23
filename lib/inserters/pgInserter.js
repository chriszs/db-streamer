var copyFrom = require('pg-copy-streams').from,
    fs = require('fs'),
    pg = require('pg'),
    RowInserter = require('./rowInserter.js'),
    stream = require('stream'),
    util = require('../util.js');

function PgInserter(options) {

    options.write = function (chunk, encoding, next) {
        this.dataStream.write(util.makeBufferText(row, this.columns),encoding,next);
    };

    var writable = new stream.Writable(options);

    writable.dbConnString = options.dbConnString;
    writable.tableName = options.tableName;
    writable.columns = options.columns;

    writable.connect = function(callback) {
        var self = this;

        pg.connect(this.dbConnString, function(err, client, done) {
            self.client = client;
            self.pgDone = done;
            if (!err) {
                self.setModel();
            }
            callback(err);
        });
    };

    writable.getCopyQueryText = function() {

        return 'COPY ' + this.tableName + '(' +
                        '"' + this.columns.join('", "') + '"' +
                        ') FROM STDIN NULL AS \'NULL\'';

    };

    writable.setModel = function(newTable, newColumns) {

        this.tableName = newTable ? newTable : this.tableName;
        this.columns = newColumns ? newColumns : this.columns;

        this.dataStream = this.client.query(copyFrom(this.getCopyQueryText()));

    };

    writable.push = function(row) {

        this.dataStream.write(util.makeBufferText(row, this.columns));

    };

    writable.end = function() {

        this.dataStream.end();

        this.pgDone();

    };

    writable.setEndHandler = function(fn) {
        this.dataStream.on('end', fn);
    };


    return writable;
}

module.exports = PgInserter;
