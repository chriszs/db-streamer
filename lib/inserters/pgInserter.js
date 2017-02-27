var copyFrom = require('pg-copy-streams').from,
    pg = require('pg'),
    stream = require('stream'),
    util = require('../util.js');

function PgInserter(options) {

    options.write = function (chunk, encoding, next) {
        return this.dataStream.write(util.makeBufferText(chunk, this.columns),encoding,next);
    };

    options.objectMode = true;

    var writable = new stream.Writable(options);

    writable.dbConnString = options.dbConnString;
    writable.tableName = options.tableName;
    writable.columns = options.columns;

    writable.connect = function (callback) {
        var self = this;

        pg.connect(this.dbConnString, function(err, client, done) {
            self.client = client;
            self.pgDone = done;
            if (!err) {
                self.setModel(self.tableName,self.columns);
            }
            callback(err);
        });
    };

    writable._getQuery = function () {

        return 'COPY ' + this.tableName + '(' +
                        '"' + this.columns.join('", "') + '"' +
                        ') FROM STDIN NULL AS \'NULL\'';

    };

    writable._emit = function () {
        this.emit.apply(this,arguments);
    };

    writable.push = function (chunk) {
        this.dataStream.write(util.makeBufferText(chunk, this.columns));
    };

    writable.setModel = function (tableName, columns) {
        if (!tableName) {
            return;
        }

        var self = this;

        self.tableName = tableName;
        self.columns = columns;

        if (this.dataStream) {
            // trick writable stream into doing a hard flush
            var state = self._writableState;

            if (state.bufferedRequestCount > 0) {
                state.corked = 1;
                state.writing = false;

                self.uncork();
            }

            self.dataStream.end();
        }

        self.dataStream = self.client.query(copyFrom(self._getQuery()));

        ['close','drain','error','pipe','unpipe'].forEach(function (e) {
            self.dataStream.on(e, self._emit.bind(self,e));
        });
    };

    writable.end = function (chunk, encoding, next) {
        this.dataStream.end(chunk, encoding, next);

        this.pgDone();

        this._emit('end');
        this._emit('finish');
    };

    return writable;
}

module.exports = PgInserter;
