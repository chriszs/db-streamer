var fs = require('fs'),
    path = require('path');

var async = require('async'),
    streamsql = require('streamsql'),
    mysql = require('mysql');

var RowInserter = require('./rowInserter.js'),
    util = require('../util.js');

var MySqlInserter = function(config) {

    this.dbname = config.dbname;
    this.username = config.username;
    this.password = config.password;
    this.tableName = config.tableName;
    this.columns = config.columns;
    this.hostname = config.hostname;
    this.port = config.port;
    this.primaryKey = config.primaryKey;

};

MySqlInserter.prototype = new RowInserter();

MySqlInserter.prototype._connect = function(callback) {

    var connectCfg = this.createConnectConfig();
    connectCfg.driver = 'mysql';
    this.db = streamsql.connect(connectCfg, callback);
};

MySqlInserter.prototype.createConnectConfig = function() {
    return {
        host: this.hostname,
        port: this.port,
        user: this.username,
        password: this.password,
        database: this.dbname
    };
};

MySqlInserter.prototype.connect = function(callback) {
    var self = this;
    this._connect(function(err) {
        if (!err) {
            self.setModel();
        }
        callback(err);
    });
};

MySqlInserter.prototype.getStreamSqlTableWriteStream = function() {
    var table = this.db.table(this.tableName, {
        fields: this.columns,
        primaryKey: this.primaryKey
    });
    var ws = table.createWriteStream();
    return table.createWriteStream();
};

MySqlInserter.prototype.setModel = function(newTable, newColumns) {

    this.tableName = newTable ? newTable : this.tableName;
    this.columns = newColumns ? newColumns : this.columns;

    this.dataStream = this.getStreamSqlTableWriteStream();

};

MySqlInserter.prototype.push = function(row) {

    var filteredRow = {};
    for (var i = 0; i < this.columns.length; i++) {
        var k = this.columns[i];

        switch (k) {
            case 'createdAt':
            case 'updatedAt':
                filteredRow[k] = row[k] ? row[k] : new Date();
                break;
            default:
                filteredRow[k] = row[k];
                break;
        }
    }
    this.dataStream.write(filteredRow);

};

MySqlInserter.prototype.end = function() {

    this.dataStream.end();

};

MySqlInserter.prototype.setEndHandler = function(fn) {
    var self = this,
        errors = [];

    this.dataStream.on('error', function(err) {
        errors.push(err);
    });

    this.dataStream.on('close', function(err) {
        self.db.close(function(closeErr) {
            fn(errors.length > 0 ? errors : closeErr);
        });
    });
};

module.exports = function(config) {
    return new MySqlInserter(config);
};
