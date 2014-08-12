var config = require('./config');
    projectJoin = "JOIN userlog ON login_id = userlog.login";
    projectWhere = "userlog.project_id = " + config.project_id;

exports.findAll = function(req, res) {
 connection.getConnection(function(err, connection) {
    connection.query('SELECT taxa.* FROM taxa ' + projectJoin + ' WHERE ' + projectWhere + ' LIMIT 20', function(error, data) {
      connection.release();
      res.jsonp(data);
    });
  });
};

exports.recent = function(req, res) {
  connection.getConnection(function(err, connection) {
    connection.query('SELECT photos.* FROM photos ' + projectJoin + ' WHERE ' + projectWhere+ ' ORDER BY date DESC LIMIT 20', function(error, data) {
      connection.release();
      res.jsonp(data);
    });
  });
};

exports.findById = function(req, res) {
 connection.getConnection(function(err, connection) {
    connection.query('SELECT taxa.* FROM taxa ' + projectJoin + ' WHERE ' + projectWhere + ' and taxa.id = ?', [req.params.id], function(error, data) {
      connection.release();
      res.jsonp(data);
    });
  });
};

exports.findByPhylum = function(req, res) {
  connection.getConnection(function(err, connection) {
    connection.query('SELECT photos.* FROM photos ' + projectJoin + ' WHERE ' + projectWhere + ' and photos.id in (SELECT photo_id from taxa,JJS_higher_taxa where class_id=JJS_higher_taxa.id and belongs_to= ?) order by date DESC', [req.params.id], function(error, data) {
      connection.release();
      res.jsonp(data);
    });
  });
};

exports.findByTaxon = function(err, req, res) {
  connection.getConnection(function(err, connection) {
    connection.query('SELECT taxa.* FROM taxa ' + projectJoin + ' WHERE ' + projectWhere + ' and taxon LIKE ? AND species LIKE ?', ["%" + req.query.name + "%", "%" + req.query.species + "%"], function(error, data) {
      connection.release();
      res.jsonp(data);
    });
  });
};

exports.photos = function(req, res) {
  if (req.query.phylum) {
    connection.getConnection(function(err, connection) {
      connection.query('SELECT photos.* FROM photos ' + projectJoin + ' WHERE ' + projectWhere + ' and photos.id in (SELECT photo_id from taxa,JJS_higher_taxa where class_id=JJS_higher_taxa.id and belongs_to= ?) order by date DESC', [req.query.phylum], function(error, data) {
        connection.release();
        res.jsonp(data);
      });
    });
  } else {
    res.send("Invalid query: please try again");
  }
};

exports.search = function(req, res) {


  //var viewdata = { 'test' : 'Hey now.'};
  //res.render('index', req.query);
  //res.jsonp(req.query);

  //connection.query('SELECT * FROM photos WHERE title like "%' + req.query.title + '%"', function(err, rows, fields) {
  //  if (err) throw err;
    //res.jsonp(rows);
  //  res.render('index', {result: rows});
  //});
  /*
  if (req.query.test) {
    res.send(req.query.test);
  } else {
    var count = Object.keys(req.query).length;
    res.send("<p>" + count + "</p>");
  }
  */
   // Code below is a javascript translation of showarchive.php

   var query,
      where;

if (req.query.pid) {
    query = "id=" + req.query.pid;
  } else {
    if (req.query.title) { 
      where = "title like '%" + req.query.title + "%'";
    }
    if (req.query.itype) {
      if (typeof where !== 'undefined') {
        where = where + " and image_type='" + req.query.itype + "'";
      } else {
        where = "image_type='" + req.query.itype + "'";
      }
    }
    if (req.query.ttype) {
      if (typeof where !== 'undefined') {
        where = where + " and type_specimen='" + req.query.ttype + "'";
      } else {
        where = "type_specimen='" + req.query.ttype + "'";
      }
    }
    if (req.query.alltype == 1) {
      if (typeof where !== 'undefined') {
        where = where + " and type_specimen not like ''";
      } else {
        where = "type_specimen not like ''";
      }
    }
    if (req.query.ummp) {
      if (typeof where !== 'undefined') {
        where = where + " and ummp like 'ummp'";
      } else { 
        where = "ummp like 'ummp'";
      }
    }

    //WRITE QUERY FOR PHOTOS TABLE ONLY
    if (typeof where !== 'undefined') {
      query = where;
    }
    where = undefined;

    //FROM HERE DOWN, CHECK EACH DATA TYPE AND SEQUENTIALLY BUILD QUERY
    
    if (req.query.mb) {
      where = "strat_id=" + req.query.mb;
    } else if (req.query.fm) {
      where = "(strat_id=" + req.query.fm + " or strat_id in (SELECT id from strat where belongs_to=" + req.query.fm + "))";
    } else if (req.query.gr) {
      where = "(strat_id=" + req.query.gr + " or strat_id in (SELECT id from strat where belongs_to=" + req.query.gr + " or belongs_to in (SELECT id from strat where belongs_to=" + req.query.gr + ")))";
    }

    if (typeof where !== 'undefined') {
      if (typeof query !== 'undefined') {
        query = query + " and photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and " + where + ")";
      } else {
        query = "photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and " + where + ")"; 
      }
    }

    where = undefined;

    if (req.query.comments) {
      where = "photo_comments.comments like '%" + req.query.comments + "%'"; 
      if (typeof query !== 'undefined') {
        query = query + " and photos.id in (SELECT photo_id from photo_comments where " + where + ")";
      } else {
        query = "photos.id in (SELECT photo_id from photo_comments where " + where + ")";
      }
    }

    where = undefined;
    
    if (req.query.comm_contrib) {
      where = "users.name='" + req.query.comm_contrib + "'";
      if (typeof query !== 'undefined') {
        query = query + " and photos.id in (SELECT photo_id from photo_comments,userlog,users where photo_comments.login_id=userlog.login and userlog.name=users.username and " + where + ")";
      } else { 
        query = "photos.id in (SELECT photo_id from photo_comments,userlog,users where photo_comments.login_id=userlog.login and userlog.name=users.username and " + where + ")";
      } 
    } 

    where = undefined;
    
    if (req.query.notes) {
      where = "photo_notes.notes like '%" + req.query.notes + "%'";  
      if (typeof query !== 'undefined') {
        query = query + " and photos.id in (SELECT photo_id from photo_notes where " + where + ")";
      } else {
        query = "photos.id in (SELECT photo_id from photo_notes where " + where + ")";
      }
    }

    where = undefined;
    
    if (req.query.contrib) {
      where = "users.name='" + req.query.contrib + "'";
      if (typeof query !== 'undefined') {
        query = query + " and photos.id in (SELECT photos.id from photos,userlog,users where photos.login_id=userlog.login and userlog.name=users.username and hide_me=0 and " + where + ")";
      } else {
        query = "photos.id in (SELECT photos.id from photos,userlog,users where photos.login_id=userlog.login and userlog.name=users.username and hide_me=0 and " + where + ")";
      }
    }

    where = undefined;
    
    if (req.query.st) {
      where = "chron_id=" + req.query.st;
    } else if (req.query.ep) {
      where = "(chron_id=" + req.query.ep + " or chron_id in (SELECT id from chron where chron.belongs_to=" + req.query.ep + "))";
    } else if (req.query.pr) {
      where = "(chron_id=" + req.query.pr + " or chron_id in (SELECT id from chron where chron.belongs_to=" + req.query.pr + " or chron.belongs_to in (SELECT id from chron where belongs_to=" + req.query.pr + ")))"; 
    }
    if (typeof where !== 'undefined') {
      if (typeof query !== 'undefined') {
        query = query + " and photos.id in (SELECT photos.id from photos,strat,chron where photos.strat_id=strat.id and strat.chron_id=chron.id and " + where + ")";
      } else {
        query = "photos.id in (SELECT photos.id from photos,strat,chron where photos.strat_id=strat.id and strat.chron_id=chron.id and " + where + ")"; 
      }
    }

    where = undefined;  
    
    if (req.query.city) {
      where = "locals.city='" + req.query.city + "'";
    }
    if (req.query.county) {
      if (typeof where !== 'undefined') {
        where = where + " and locals.county='" + req.query.county + "'"; 
      } else {
        where = "locals.county='" + req.query.county + "'";
      }
    }
    if (req.query.state) {
      if (typeof where !== 'undefined') {
        where = where + " and locals.state='" + req.query.state + "'"; 
      } else {
        where = "locals.state='" + req.query.state + "'";
      }
    }
    if (typeof where !== 'undefined') {
      if (typeof query !== 'undefined') {
        query = query + " and photos.id in (SELECT photos.id from photos,locals where photos.local_id=locals.id and " + where + ")";
      } else {
        query = "photos.id in (SELECT photos.id from photos,locals where photos.local_id=locals.id and " + where + ")";
      }
    }

    where = undefined;
    
    connection.query("SELECT photos.* FROM photos "  + projectWhere + " WHERE " + projectWhere + " and " + query, function(err, rows, fields) {
      if (err) throw err;
      res.render('searchResults', {result: rows});
    });
  }
  //res.send("<p>" + query + "</p>")
};