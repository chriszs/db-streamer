// jshint esnext:true

const assert = require('chai').assert,
    moment = require('moment'),
    Sequelize = require('sequelize');

const dbStreamer = require('../../index.js');

if (typeof Promise == 'undefined') {
    global.Promise = require('promise-polyfill');
}

let sequelizeConfig;

const streamerConfig = {
    tableName: 'test_table',
    columns: ['a', 'b', 'c', 'created_date', 'updated_date'],
    primaryKey: 'a'
};

switch (process.env.DIALECT) {
    case 'mysql':
        sequelizeConfig = 'mysql://streamer:streamer@localhost:3306/streamer_test';
        break;
    case 'postgres':
        sequelizeConfig = 'postgres://streamer:streamer@localhost:5432/streamer_test';
        break;
    default:
        throw new Error('Invalid DIALECT');
}

streamerConfig.dbConnString = sequelizeConfig;

const sequelize = new Sequelize(sequelizeConfig, { logging: false });

const testModel = sequelize.define('test_table', {
    a: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    b: Sequelize.STRING,
    c: Sequelize.DATE
}, {
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    underscored: true,
    freezeTableName: true
});

const assertDataExists = (expectedObj, usedSequelizeInserter, callback) => {
    setTimeout(() => {
        testModel
            .findOne({ where: { a: expectedObj.a } })
            .then(result => {
                assert.isNotNull(result);
                for (let k in expectedObj) {
                    if (k === 'c') {
                        let expectedUnix = Math.floor((new Date(expectedObj.c)).getTime() / 1000);
                        if (!usedSequelizeInserter && process.env.DIALECT == 'mysql') {
                            expectedUnix -= (new Date(expectedObj.c)).getTimezoneOffset() * 60;
                        }
                        assert.equal(moment(result[k]).unix(), expectedUnix);
                    } else {
                        assert.equal(result[k], expectedObj[k]);
                    }
                }
            })
            .then(callback)
            .catch(callback);
    }, 500);
};

describe('data loading', () => {

    beforeEach(function() {
        // (re)create table
        this.timeout(15000);

        return testModel.sync({ force: true });
    });

    const tests = [
        { method: 'sequelize bulk', config: { useSequelizeBulkInsert: true, sequelizeModel: testModel } }
    ];

    if (process.env.DIALECT == 'postgres') {
        tests.push({ method: 'dialect', config: streamerConfig });
    }

    tests.forEach(test => {
        it(`data should load using ${test.method} inserter`, function(done) {
            this.timeout(15000);

            // create inserter
            const stream = dbStreamer(test.config);

            // establish connection
            stream.connect(err => {

                // push some rows
                const firstRow = { a: 1, b: 'one', c: new Date(12345) };
                stream.push(firstRow);
                stream.push({ a: 2, b: 'two', c: new Date() });
                stream.push({ a: 3, b: 'three', c: new Date() });

                // set end callback
                stream.on('end',err => {
                    if (err) {
                        done(err);
                    } else {
                        assertDataExists(firstRow, test.config.useSequelizeBulkInsert, err => {
                            if (err) {
                                done(err);
                            }
                            done();
                        });
                    }
                });

                // announce end
                stream.end();

            });
        });
    });
});
