// jshint esnext:true

const async = require('async'),
      stream = require('stream');

function SequelizeBulkInserter(options) {

    options.write = function (chunk, encoding, next) {
        if (!this.model || chunk.model.tableName !== this.model.tableName) {
            this.setModel(chunk.model);
        }

        this.bulkInserter.push(chunk,next);

        return this.highWaterMark <= this.bulkInserter.length;
    };

    options.objectMode = true;

    const writable = new stream.Writable(options);

    writable.sequelize = options.sequelize;
    writable.transaction = options.transaction;
    writable.highWaterMark = options.highWaterMark ? options.highWaterMark : 1000;

    writable.connect = function(callback) {
        if (callback) {
            callback();
        }
    };

    writable.setModel = function(model) {
        if (!model) {
            return;
        }

        let self = this;

        self.model = model;

        self.bulkInserter = async.cargo((data, inserterCallback) => {
                model.bulkCreate(data,{
                    transaction: self.transaction
                }).then(() => {
                    inserterCallback();
                });
            },
            self.highWaterMark
        );

        // self.bulkInserter.drain = self.emit.bind(self,'end');
    };

    writable.push = function (chunk) {
        this.bulkInserter.push(chunk);
    };

    writable.end = function (chunk, encoding, next) {
        if (typeof chunk !== 'undefined' && chunk !== null) {
            this.write(chunk,encoding,next);
        }

        this.bulkInserter.resume();
    };

    return writable;
}

module.exports = SequelizeBulkInserter;
