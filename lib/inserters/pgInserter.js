// jshint esnext:true

const copyFrom = require('pg-copy-streams').from,
      pg = require('pg'),
      stream = require('stream'),
      util = require('../util.js'),
      async = require('async');

function PgInserter(options) {

    options.write = function (chunk, encoding, next) {
        let self = this;

        if (!self.client) {
            self.connect((err) => {
                if (err) {
                    next(err);
                    return;
                }

                self.actuallyWrite(chunk,encoding,next);
            });

            return true;
        }
        else {
            self.actuallyWrite(chunk,encoding,next);
        }
    };

    options.objectMode = true;

    const writable = new stream.Writable(options);

    writable.sequelize = options.sequelize;
    writable.transaction = options.transaction;

    writable.actuallyWrite = function (chunk,encoding,next) {
        if (!this.model || chunk.model.tableName !== this.tableName) {
            this.setModel(chunk.model);
        }

        this.dataStream.write(util.makeBufferText(chunk, this.columns),encoding,next);
    };

    writable.connect = function (callback) {
        const self = this;

        if (self.transaction) {
            self.client = self.transaction.connection;

            callback();

            return;
        }

        self.sequelize.connectionManager.getConnection()
            .then((client) => {
                self.client = client;

                callback();
            })
            .catch(callback);
    };

    writable._getQuery = function () {
        return `COPY ${this.tableName}("${this.columns.join('", "')}") FROM STDIN NULL AS 'NULL'`;
    };

    writable._emit = function () {
        this.emit(...arguments);
    };

    writable.push = function (chunk) {
        this.dataStream.write(util.makeBufferText(chunk, this.columns));
    };

    writable.setModel = function (model) {
        if (!model) {
            return;
        }

        const self = this;

        self.model = model;
        self.tableName = model.tableName;
        self.columns = Object.keys(model.attributes)
                            .filter(function (value) {
                                return value !== 'id';
                            });

        if (this.dataStream) {
            self.dataStream.end();
        }

        self.dataStream = self.client.query(copyFrom(self._getQuery()));

        ['close','drain','error','pipe','unpipe'].forEach(e => {
            self.dataStream.on(e, self._emit.bind(self,e));
        });
    };

    writable.clearBuffer = function (next) {
        // kind of a hack
        let self = this;

        self.cork();

        let buffer = self._writableState.getBuffer();

        async.mapSeries(buffer,(item,cb) => {
            self._write(item.chunk,item.encoding,cb);
        },next);
    };

    writable.end = function (chunk, encoding, next) {
        this.clearBuffer(() => {

            this.dataStream.end(chunk, encoding, next);
            
            if (!this.transaction) {
                this.sequelize.connectionManager.releaseConnection(this.client);
            }

            this._emit('end');
            this._emit('finish');
        });
    };

    return writable;
}

module.exports = PgInserter;
