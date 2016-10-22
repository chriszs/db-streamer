var fs = require('fs');

var copyFrom = require('pg-copy-streams').from,
    pg = require('pg');

var RowInserter = require('./rowInserter.js'),
    util = require('../util.js');

var PgInserter = function(config) {

    this.dbConnString = config.dbConnString;
    this.tableName = config.tableName;
    this.columns = config.columns;

};

PgInserter.prototype = new RowInserter();

PgInserter.prototype.connect = function(callback) {

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

PgInserter.prototype.getCopyQueryText = function() {

    var queryTxt = 'COPY ' + this.tableName + '(';
    queryTxt += '"' + this.columns.join('", "') + '"';
    queryTxt += ') FROM STDIN NULL AS \'NULL\'';
    return queryTxt;

};

PgInserter.prototype.setModel = function(newTable, newColumns) {

    this.tableName = newTable ? newTable : this.tableName;
    this.columns = newColumns ? newColumns : this.columns;

    this.dataStream = this.client.query(copyFrom(this.getCopyQueryText()));

};

PgInserter.prototype.push = function(row) {

    this.dataStream.write(util.makeBufferText(row, this.columns));

};

PgInserter.prototype.end = function() {

    this.dataStream.end();

    this.pgDone();

};

PgInserter.prototype.setEndHandler = function(fn) {
    this.dataStream.on('end', fn);
};

module.exports = function(config) {
    return new PgInserter(config);
};
