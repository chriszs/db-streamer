var async = require('async'),
    stream = require('stream');

function SequelizeBulkInserter(options) {

    options.write = function (chunk, encoding, next) {
        this.bulkInserter.push(chunk,next);

        return this.highWaterMark <= this.bulkInserter.length;
    };

    options.objectMode = true;

    var writable = new stream.Writable(options);

    writable.model = options.sequelizeModel;
    writable.highWaterMark = options.highWaterMark ? options.highWaterMark : 1000;

    writable.connect = function(callback) {
        writable.setModel(this.model);

        if (callback) {
            callback();
        }
    };

    writable.setModel = function(model) {
        if (!model) {
            return;
        }

        this.model = model;

        this.bulkInserter = async.cargo(function(data, inserterCallback) {
                model.bulkCreate(data).then(function() {
                    inserterCallback();
                });
            },
            this.highWaterMark
        );

        this.bulkInserter.drain = this.emit.bind(this,'end');
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
