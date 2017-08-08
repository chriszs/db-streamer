// jshint esnext:true

const copyFrom = require('pg-copy-streams').from,
      pg = require('pg'),
      stream = require('stream'),
      util = require('../util.js');

function PgInserter(options) {

    options.write = function (chunk, encoding, next) {
        if (!this.client) {
            this.connect((err) => {
                if (err) {
                    next(err);
                    return;
                }

                if (!this.model || chunk.model.tableName !== this.tableName) {
                    this.setModel(chunk.model);
                }

                this.dataStream.write(util.makeBufferText(chunk, this.columns),encoding,next);
            });

            return false;
        }
        else {
            if (!this.model || chunk.model.tableName !== this.tableName) {
                this.setModel(chunk.model);
            }

            return this.dataStream.write(util.makeBufferText(chunk, this.columns),encoding,next);
        }
    };

    options.objectMode = true;

    const writable = new stream.Writable(options);

    writable.sequelize = options.sequelize;
    writable.transaction = options.transaction;

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
        // https://github.com/nodejs/node/blob/master/lib/_stream_writable.js#L467

        let state = this._writableState;

        state.bufferProcessing = true;

        let buffer = this._writableState.getBuffer();

        async.mapSeries(buffer,(item,cb) => {
            self.write(item.chunk,item.encoding,cb);
        },() => {
            state.bufferedRequestCount = 0;
            state.bufferedRequest = null;
            state.bufferProcessing = false;

            next();
        });
    };

    writable.end = function (chunk, encoding, next) {
        //if (this._writableState.getBuffer().length > 0) {
            this.clearBuffer(() => {

                this.dataStream.end(chunk, encoding, next);
                
                if (!this.transaction) {
                    this.sequelize.connectionManager.releaseConnection(this.client);
                }

                //this.pgDone();

                this._emit('end');
                this._emit('finish');
            });
        //}

    };

    return writable;
}

module.exports = PgInserter;
