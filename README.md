# db-streamer

A library to stream data into a SQL database, forked from [evansiroky/db-streamer](https://github.com/evansiroky/db-streamer).  Currently supports streaming data into PostgreSQL or MySQL tables.

## Additional Dependencies

In order to use this library, you must also install the additional libraries in your project depending on the database that you use.

### PostgreSQL

```sh
    npm install pg --save
    npm install pg-copy-streams --save
```

### MySQL

```sh
    npm install mysql --save
    npm install streamsql --save
```

## Usage

```javascript
    var dbStreamer = require('db-streamer'),
      connString = 'postgres://streamer:streamer@localhost:5432/streamer-test';
    
    // create inserter
    var inserter = dbStreamer.getInserter({
      dbConnString: connString,
      tableName: 'test_table',
      columns: ['a', 'b', 'c']
    });

    // establish connection
    inserter.connect(function(err, client) {

      // push some rows
      inserter.push({a: 1, b: 'one', c: new Date() });
      inserter.push({a: 2, b: 'two', c: new Date() });
      inserter.push({a: 3, b: 'three', c: new Date() });

      // create child table inserter using deferring strategy
      // this is useful to avoid missing foreign key conflicts as a result of race conditions
      var childInserter = dbStreamer.getInserter({
        dbConnString: connString,
        tableName: 'child_table',
        columns: ['a', 'd', 'e'],
        deferUntilEnd: true
      });

      childInserter.push({a: 2, d: 'asdf', e: new Date() });
      childInserter.push({a: 3, d: 'ghjk', e: new Date() });

      childInserter.setEndHandler(callback);

      // set end callback
      inserter.setEndHandler(function() {
        childInserter.end();
      });

      // announce end
      inserter.end();

    });
```
    
### Inserter Config

| Key | Description |
| --- | --- |
| dbConnString | A database connection string. |
| tableName | The tablename to insert into. |
| columns | Array of column names. |
| primaryKey | Required if using MySQL.  String of the primary key (defaults to `id` if omitted). |
| deferUntilEnd | Boolean (default=false).  Stream output to temporary file which is then streamed in all at once into table upon calling `end`. |

### Inserter Config (Sequelize Bulk Insert alternative)

| Key | Description |
| --- | --- |
| useSequelizeBulkInsert | Boolean.  Perform the insert using a combination of [async.cargo](https://github.com/caolan/async#cargo) and [sequelize bulkInsert](http://docs.sequelizejs.com/en/latest/api/model/#bulkcreaterecords-options-promisearrayinstance).  Must provide `sequelizeModel` parameter too. |
| sequelizeModel | The sequelize model to perform a bulk insert with. |
| deferUntilEnd | Boolean (default=false).  Pause all cargo iterations until calling `end`. |