# db-streamer

A library to stream data into a SQL database, forked from [evansiroky/db-streamer](https://github.com/evansiroky/db-streamer).  Currently supports streaming data into PostgreSQL or using a [Sequelize](http://sequelizejs.com/) model to load data into any database supported by Sequelize.

## Usage

```javascript
var dbStreamer = require('db-streamer'),
    connString = 'postgres://streamer:streamer@localhost:5432/streamer-test';

// create inserter
var stream = dbStreamer({
    dbConnString: connString,
    tableName: 'test_table',
    columns: ['a', 'b', 'c']
});

// establish connection
stream.connect(function(err, client) {

    // push some rows
    stream.push({ a: 1, b: 'one', c: new Date() });
    stream.push({ a: 2, b: 'two', c: new Date() });
    stream.push({ a: 3, b: 'three', c: new Date() });

    // announce end
    stream.end();

});
```
    
### Inserter Config

| Key | Description |
| --- | --- |
| dbConnString | A database connection string. |
| tableName | The tablename to insert into. |
| columns | Array of column names. |

### Inserter Config (Sequelize Bulk Insert alternative)

| Key | Description |
| --- | --- |
| useSequelizeBulkInsert | Boolean.  Perform the insert using a combination of [async.cargo](https://github.com/caolan/async#cargo) and [sequelize bulkInsert](http://docs.sequelizejs.com/en/latest/api/model/#bulkcreaterecords-options-promisearrayinstance).  Must provide `sequelizeModel` parameter too. |
| sequelizeModel | The sequelize model to perform a bulk insert with. |