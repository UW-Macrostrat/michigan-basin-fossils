var mysql = require("mysql"),
    config = require("./routes/config"),
    async = require("async"),
    http = require("http");

var mysqlConn = mysql.createPool(config.credentials);

mysqlConn.getConnection(function(err, connection) {
  connection.query("SELECT id, taxon FROM taxa", function(error, result) {
    if (error) {
      console.log(error);
    } else {
      async.each(result, function(record, callback) {
        http.get('http://paleobiodb.org/data1.1/taxa/single.json?name=' + record.taxon + '&show=attr,nav', function(response) {
          var body = '';

          response.on('data', function(chunk) {
            body += chunk;
          });

          response.on('end', function() {
            var data = JSON.parse(body);

            if (data.records.length > 0) {
              var clt = (data.records[0].clt) ? data.records[0].clt.nam : "",
                  odt = (data.records[0].odt) ? data.records[0].odt.nam : "",
                  fmt = (data.records[0].fmt) ? data.records[0].fmt.nam : "",
                  pht = (data.records[0].pht) ? data.records[0].pht.nam : "";

              connection.query("UPDATE taxa SET pbdb_class = ?, pbdb_order = ?, pbdb_family = ?, pbdb_phylum = ? WHERE id = ?", [clt, odt, fmt, pht, record.id], function(e, d) {
                if (e) {
                  callback(e);
                } else {
                  console.log("Done with ", record.taxon);
                  callback();
                }
              });
            } else {
              callback();
            }
          });
        });
      }, function(err) {
        connection.release();
        if (err) {
          console.log(err);
          process.exit(code=1);
        } else {
          console.log("Done!");
          process.exit(code=0);
        }
      });
    }
  });
});

      
