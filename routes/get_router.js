var config = require('./config');
    async = require('async');
    projectJoin = "JOIN userlog ON login_id = userlog.login";
    projectWhere = "userlog.project_id = " + config.project_id;

exports.logout = function(req, res) {
  var d = new Date(),
      year = d.getFullYear(),
      month = d.getMonth() + 1,
      day = d.getDate(),
      hours = d.getHours(),
      minutes = d.getMinutes(),
      seconds = d.getSeconds(),
      fullDate = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;


  conn.query("UPDATE userlog SET time_end = ? WHERE login = ?", [fullDate, req.session.uid], function(error, result) {

    delete req.session.user_id;
    res.redirect('/');
  });

}
// Route for the index page of the website
exports.root = function(req, res) {

    async.parallel({
      one: function(callback) {
        conn.query('SELECT DISTINCT (photos.id) FROM photos ' + projectJoin + ' WHERE ' + projectWhere + ' and cover_pic = 1 ORDER BY RAND() LIMIT 1', function(error, rows, fields) {
          callback(null, rows);
        });
      },
      two: function(callback) {
        conn.query('SELECT DISTINCT (photos.id) FROM photos ' + projectJoin + ' WHERE ' + projectWhere + ' ORDER BY RAND() LIMIT 16', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      three: function(callback) {
        conn.query("select (select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_phylum = 'Arthropoda') AS arthropodCount, (select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_phylum = 'Echinodermata') AS echinodermCount, (select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_phylum = 'Brachiopoda') AS brachiopodCount,(select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_class = 'Anthozoa') AS coralCount, (select distinct taxa.photo_id FROM photos join taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_phylum = 'Arthropoda' order by rand() limit 1) AS uniqueArthropod, (select distinct taxa.photo_id FROM photos JOIN taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_phylum = 'Echinodermata' order by rand() limit 1) AS unqiueEchinoderm, (select distinct taxa.photo_id FROM photos JOIN taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_phylum = 'Brachiopoda' order by rand() limit 1) AS uniqueBrachiopod, (select distinct taxa.photo_id FROM photos JOIN taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_class = 'Anthozoa' order by rand() limit 1) AS uniqueCoral, (select count(distinct taxon) AS taxa FROM taxa " + projectJoin + " WHERE " + projectWhere + ") AS taxaCount, (select count(distinct users.name) AS users FROM users JOIN userlog ON userlog.name=users.username WHERE " + projectWhere + ") AS users, (select count(distinct photos.id) AS photos FROM photos " + projectJoin + " WHERE " + projectWhere + ") AS photos, (select date_format(photos.date,'%M %d, %Y') FROM photos " + projectJoin + " WHERE " + projectWhere + " order by photos.date desc limit 1) AS mostRecent", function(err, rows, fields) {
          callback(null, rows);
        });
      },
      four: function(callback) {
        conn.query("select count(distinct photos.id) AS photos,count(distinct taxa.pbdb_taxon_no) AS genera,count(distinct photos.type_specimen) AS type_specimen,locals_mod2.county_fips AS fips,group_concat(distinct ' ',strat.unit separator ',') AS strat FROM photos JOIN locals_mod2 on locals_mod2.id = photos.local_id JOIN taxa on taxa.photo_id = photos.id JOIN strat on strat.id = photos.strat_id JOIN userlog on photos.login_id=login WHERE " + projectWhere + " group by locals_mod2.county_fips", function(err, rows, fields) {
          callback(null, rows)
        });
      }
    },
    function(err, result) {

      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }
      res.render('index3', {
        login: login_id,
        mapdata: JSON.stringify(result.four),
        stats: result.three,
        titlePic: result.one,
        photos: result.two,
        partials: {
          "footer": "footer"
        }
      })
    })

}

exports.autocomplete = function(req, res) {

    async.parallel({
      one: function(callback) {
        conn.query('SELECT DISTINCT taxon AS label, "Taxa" as category FROM taxa ' + projectJoin + ' WHERE ' + projectWhere +' and taxon LIKE ?', [req.query.q + "%"], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows);
          }
        });
      },
      two: function(callback) {
        conn.query('SELECT DISTINCT species AS label, "Species" as category FROM taxa ' + projectJoin + ' WHERE ' + projectWhere +' and species like ? ', [req.query.q + "%"], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows);
          }
        });
      },
      three: function(callback) {
        conn.query('SELECT DISTINCT stage AS label, "Time" as category FROM chron WHERE stage like ?', [req.query.q + "%"], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows);
          }
        });
      },
      four: function(callback) {
        conn.query('SELECT DISTINCT unit AS label, "Strat" as category FROM strat WHERE unit like ? ', [req.query.q + "%"], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows);
          }
        });
      },
      five: function(callback) {
        conn.query('SELECT DISTINCT users.name AS label, "Users" as category FROM users JOIN userlog ON users.username=userlog.name WHERE ' + projectWhere +' and users.name like ? ', ["%" + req.query.q + "%"], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows);
          }
        });
      }
    }, 
    function(error, result) {

      if (error) {
        console.log("autocomplete - ", error);
      }
      var data = result.one.concat(result.two, result.three, result.four, result.five);
      res.jsonp(data);
    });

}

exports.statPage = function(req, res) {
  res.render('stats', {
    partials: {
      "navbar": "navbar",
      "footer": "footer"
    }
  });
}

exports.randomPhotos = function(req, res) {
  conn.query('SELECT distinct photos.id FROM photos ' + projectJoin + ' WHERE ' + projectWhere + ' ORDER BY RAND() LIMIT ' + req.params.id, function(error, data) {
    res.jsonp(data);
  });
}

exports.stats = function(req, res) {
  conn.query("select (select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_phylum = 'Arthropoda') AS arthropodCount, (select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_phylum = 'Echinodermata') AS echinodermCount, (select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_phylum = 'Brachiopoda') AS brachiopodCount,(select count(distinct taxa.photo_id) FROM taxa " + projectJoin + " WHERE " + projectWhere + " and taxa.pbdb_class = 'Anthozoa') AS coralCount, (select distinct taxa.photo_id FROM photos join taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_phylum = 'Arthropoda' order by rand() limit 1) AS uniqueArthropod, (select distinct taxa.photo_id FROM photos JOIN taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_phylum = 'Echinodermata' order by rand() limit 1) AS unqiueEchinoderm, (select distinct taxa.photo_id FROM photos JOIN taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_phylum = 'Brachiopoda' order by rand() limit 1) AS uniqueBrachiopod, (select distinct taxa.photo_id FROM photos JOIN taxa ON taxa.photo_id = photos.id JOIN userlog on photos.login_id = login WHERE " + projectWhere + " and photos.cover_pic = 1 and taxa.pbdb_class = 'Anthozoa' order by rand() limit 1) AS uniqueCoral, (select count(distinct taxon) AS taxa FROM taxa " + projectJoin + " WHERE " + projectWhere + ") AS taxaCount, (select count(distinct users.name) AS users FROM users JOIN userlog ON userlog.name=users.username WHERE " + projectWhere + ") AS users, (select count(distinct photos.id) AS photos FROM photos " + projectJoin + " WHERE " + projectWhere + ") AS photos, (select date_format(photos.date,'%M %d, %Y') FROM photos " + projectJoin + " WHERE " + projectWhere + " order by photos.date desc limit 1) AS mostRecent", function(error, data) {
    res.jsonp(data);
  });

}

exports.monthly_stats = function(req, res) {
  conn.query('select monthname(photos.date) AS month,year(photos.date) AS year,count(0) AS sum FROM photos ' + projectJoin + ' WHERE ' + projectWhere + ' GROUP BY year(photos.date),month(photos.date)', function(error, data) {
    res.jsonp(data);
  });
}

exports.user_contributions = function(req, res) {
  conn.query('SELECT count(distinct photos.id) AS count,users.name AS name FROM photos JOIN userlog on userlog.login = photos.login_id JOIN users on users.username = userlog.name WHERE ' + projectWhere + ' GROUP BY users.username', function(error, data) {
    res.jsonp(data);
  });
}

exports.timeSeries = function(req, res) {
  if (req.query.stats === "true" || typeof req.session.query === "undefined") {
    async.parallel([
      function(callback) {
        conn.query('SELECT id AS chron_id, stage, age_bottom, age_top, (age_bottom - age_top) AS total_time, count FROM (SELECT chron.stage, chron.id, chron.age_bottom, chron.age_top FROM chron WHERE rank = "epoch" AND age_bottom < 500 AND age_bottom > 300 ORDER BY age_bottom DESC) c LEFT OUTER JOIN (SELECT COUNT(DISTINCT pbdb_genus) AS count, containing_stage FROM taxa JOIN photos ON photo_id = photos.id JOIN userlog on photos.login_id=login WHERE ' + projectWhere + ' GROUP BY containing_stage) p ON c.stage = p.containing_stage order by age_bottom', function(error, data) {
          callback(null, data);
        });
      },
      function(callback) {
        conn.query('SELECT stage, chron.id AS chron_id, (age_bottom - age_top) AS total_time, age_bottom, age_top FROM chron WHERE rank = "period" AND age_bottom < 541 AND age_bottom > 300 ORDER BY age_bottom DESC', function(error, data) {
          callback(null, data);
        });
      }
    ], function(err, result) {
      res.jsonp({
        "epochs": result[0],
        "periods": result[1]
      });
    });
  } else {
    async.parallel([
      function(callback) {
        conn.query('SELECT id AS chron_id, stage, age_bottom, age_top, (age_bottom - age_top) AS total_time, count FROM (SELECT chron.stage, chron.id, chron.age_bottom, chron.age_top FROM chron WHERE rank = "epoch" AND age_bottom < 500 AND age_bottom > 300) c LEFT OUTER JOIN (SELECT COUNT(DISTINCT pbdb_genus) AS count, containing_stage from taxa JOIN photos ON photo_id = photos.id JOIN userlog on photos.login_id=login WHERE ' + projectWhere + ' and ' + req.session.query + ' GROUP BY containing_stage) p ON c.stage = p.containing_stage ORDER BY age_bottom', function(error, data) {
          callback(null, data);
        });
      },
      function(callback) {
        conn.query('SELECT stage, chron.id AS chron_id, (age_bottom - age_top) AS total_time, age_bottom, age_top FROM chron WHERE rank = "period" AND age_bottom < 541 AND age_bottom > 300 ORDER BY age_bottom DESC', function(error, data) {
          callback(null, data);
        });
      }
    ], function(err, result) {
      res.jsonp({
        "epochs": result[0],
        "periods": result[1]
      });
    });
  } 
}

exports.faq = function(req, res) {
  if (typeof req.session.user_id == 'undefined') {
    var login_id = [];
  } else {
    var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
  }
  res.render('faq', {
    login: login_id,
    partials: {
      "head": "head",
      "navbar": "navbar",
      "footer": "footer"
    }
  });
}

exports.about = function(req, res) {
  if (typeof req.session.user_id == 'undefined') {
    var login_id = [];
  } else {
    var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
  }
  res.render('about', {
    login: login_id,
    partials: {
      "head": "head",
      "navbar": "navbar",
      "footer": "footer"
    }
  });
}

exports.aboutus = function(req, res) {
  if (typeof req.session.user_id == 'undefined') {
    var login_id = [];
  } else {
    var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
  }
  res.render('aboutus', {
    login: login_id,
    partials: {
      "head": "head",
      "navbar": "navbar",
      "footer": "footer"
    }
  });
}

exports.legal = function(req, res) {
  if (typeof req.session.user_id == 'undefined') {
    var login_id = [];
  } else {
    var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
  }
  res.render('legal', {
    login: login_id,
    partials: {
      "head": "head",
      "navbar": "navbar",
      "footer": "footer"
    }
  });
}

exports.advancedSearch = function(req, res) {
    async.parallel({
      counties: function(callback) {
        conn.query('SELECT county FROM counties_mod ORDER BY county ASC', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      users: function(callback) {
        conn.query('SELECT name FROM users ORDER BY name ASC', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      commenters: function(callback) {
        conn.query('SELECT DISTINCT users.name FROM photo_comments JOIN userlog ON userlog.login = photo_comments.login_id JOIN users ON users.username = userlog.name ORDER BY name ASC', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      groups: function(callback) {
        conn.query('SELECT id, unit FROM strat WHERE rank = "Gr" ORDER BY unit ASC', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      formations: function(callback) {
        conn.query('SELECT id, unit FROM strat WHERE rank = "Fm" ORDER BY unit ASC', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      members: function(callback) {
        conn.query('SELECT id, unit FROM strat WHERE rank = "Mb" ORDER BY unit ASC', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      periods: function(callback) {
        conn.query('SELECT id, stage FROM chron WHERE rank = "period"', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      epochs: function(callback) {
        conn.query('SELECT id, stage FROM chron WHERE rank = "epoch"', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      stages: function(callback) {
        conn.query('SELECT id, stage FROM chron WHERE rank = "stage"', function(err, rows, fields) {
          callback(null, rows);
        });
      },
      mapdata: function(callback) {
        conn.query("SELECT count(photos.local_id) AS photos,count(distinct taxa.taxon) AS genera,count(distinct photos.type_specimen) AS type_specimen,locals_mod2.county_fips AS fips,group_concat(distinct ' ',strat.unit separator ',') AS strat FROM photos JOIN locals_mod2 on locals_mod2.id = photos.local_id JOIN taxa on taxa.photo_id = photos.id JOIN strat on strat.id = photos.strat_id JOIN userlog on photos.login_id=login WHERE " + projectWhere + " group by locals_mod2.county_fips", function(err, rows, fields) {
          callback(null, rows);
        });
      }
    }, 
    function(error, result) {
      if (error) {
        console.log("advancedSearch - ", error);
        res.redirect("/");
      } else {
        if (typeof req.session.user_id == 'undefined') {
          var login_id = [];
        } else {
          var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
        }
        res.render('advancedSearch', {
          login: result.login_id, 
          counties: result.counties, 
          users: result.users, 
          ommenters: result.commenters, 
          groups: result.groups, 
          formations: result.formations, 
          members: result.members, 
          periods: result.periods, 
          epochs: result.epochs, 
          stages: result.stages, 
          mapdata: JSON.stringify(result.mapdata),
          partials: {
            "head": "head",
            "navbar": "navbar",
            "footer": "footer"
          }
        });
      }
    });
}

exports.getCounties = function(req, res) {
  conn.query('SELECT DISTINCT county from locals_mod2 WHERE state = ? ORDER BY county ASC', [req.query.state], function(error, data) {
    if (error) {
      console.log("getCounties - ", error);
    }
    res.jsonp(data);
  });
}

exports.getCities = function(req, res) {
  conn.query('SELECT city from locals_mod2 WHERE state = ? && county = ? ORDER BY city ASC', [req.query.state, req.query.county], function(error, data) {
    if (error) {
      console.log("getCities - ", error);
    }
    res.jsonp(data);
  });
}

exports.verifyTaxa = function(req, res) {
  conn.query('SELECT class AS tclass FROM JJS_genera WHERE genus = ?', [req.query.genus], function(error, data) {
    if (error) {
      console.log("verifyTaxa - ", error);
    }
    res.jsonp(data);
  });
}

exports.upload = function(req, res) {
  async.parallel({
    groups: function(callback) {
      conn.query('SELECT id, unit FROM strat WHERE rank = "Gr" ORDER BY unit ASC', function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, rows);
        }
      });
    },
    formations: function(callback) {
      conn.query('SELECT id, unit FROM strat WHERE rank = "Fm" ORDER BY unit ASC', function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, rows);
        }
      });
    },
    members: function(callback) {
      conn.query('SELECT id, unit FROM strat WHERE rank = "Mb" ORDER BY unit ASC', function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, rows);
        }
      });
    }
  }, 
  function(error, result) {

    if (error) {
      console.log("upload - ", error);
    }
    if (typeof req.session.user_id == 'undefined') {
      var login_id = [];
    } else {
      var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
    }

    res.render('upload', {
      login: login_id, 
      groups: result.groups, 
      formations: result.formations, 
      members: result.members,
      partials: {
        "head": "head",
        "navbar": "navbar",
        "footer": "footer"
      }
    });
  });
}

exports.editRecord = function(req, res) {
  async.parallel({
    check: function(callback) {
      conn.query('SELECT DISTINCT photos.id, users.name FROM photos JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name WHERE photos.id = ?', [req.params.id], function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          if (rows[0].name != req.session.full_name) {
            console.log("wrong name");
            callback(rows[0].name, null)
          } else {
            callback(null, rows[0].name);
          }
        }
      });
    },
    members: function(callback) {
      conn.query('SELECT id, unit FROM strat WHERE rank = "Mb" ORDER BY unit ASC', function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, rows);
        }
      });
    },
    formations: function(callback) {
      conn.query('SELECT id, unit FROM strat WHERE rank = "Fm" ORDER BY unit ASC', function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, rows);
        }
      });
    },
    groups: function(callback) {
      conn.query('SELECT id, unit FROM strat WHERE rank = "Gr" ORDER BY unit ASC', function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, rows);
        }
      });
    },
    taxa: function(callback) {
      conn.query('SELECT taxon, taxon_reso, species, species_reso FROM taxa where photo_id = ?', [req.params.id], function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, rows);
        }
      });
    },
    result: function(callback) {
      conn.query("SELECT DISTINCT photos.id, photos.title, photos.image_type, photos.ummp, photos.strat_id, photos.type_specimen, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id WHERE photos.id = ?", [req.params.id],
        function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows);
          }
      });
    }
  }, 
  function(error, result) {
    if (error) {
      console.log("editRecord - ", error);
      res.send('You are not authorized to edit this record');
    }

    if (typeof req.session.user_id == 'undefined') {
      var login_id = [];
    } else {
      var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
    }

    res.render('editRecord', {
      login: login_id, 
      result: JSON.stringify(result.result), 
      taxa: JSON.stringify(result.taxa), 
      groups: result.groups, 
      formations: result.formations, 
      members: result.members,
      partials: {
        "head": "head",
        "navbar": "navbar",
        "footer": "footer"
      }
    });
  });
}

// Used to populate the map on the home page
exports.mapData = function(req, res) {
  conn.query("SELECT count(photos.id) AS photos,count(distinct taxa.taxon) AS genera, count(distinct photos.type_specimen) AS type_specimen,locals_mod2.county_fips AS fips,group_concat(distinct ' ',strat.unit separator ',') AS strat FROM photos JOIN locals_mod2 on locals_mod2.id = photos.local_id JOIN taxa on taxa.photo_id = photos.id JOIN strat on strat.id = photos.strat_id JOIN userlog ON photos.login_id=login WHERE " + projectWhere + " GROUP BY locals_mod2.county_fips", function(error, data) {
    res.jsonp(data);
  });
};

exports.map = function(req, res) {
  conn.query("select count(photos.id) AS photos,count(distinct taxa.taxon) AS genera,count(distinct photos.type_specimen) AS type_specimen,locals_mod2.county_fips AS fips,group_concat(distinct ' ',strat.unit separator ',') AS strat FROM photos JOIN locals_mod2 on locals_mod2.id = photos.local_id JOIN taxa on taxa.photo_id = photos.id JOIN strat on strat.id = photos.strat_id JOIN userlog ON photos.login_id=login WHERE " + projectWhere + " GROUP BY locals_mod2.county_fips", function(error, data) {
    if (typeof req.session.user_id == 'undefined') {
      var login_id = [];
    } else {
      var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
    }
    res.render('map', {
      login: login_id, 
      mapdata: JSON.stringify(data)
    });
  });
}

exports.viewrecord = function(req, res) {
  async.parallel({
    mapdata: function(callback) {
      conn.query("SELECT COUNT(photos.id) as photos, locals_mod2.county_fips as fips FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id WHERE photos.id = ? GROUP BY locals_mod2.county_fips", [req.params.id], function(err, data) {
        if (err) {
          callback(err);
        } else {
          callback(null, data);
        }
      });
    },
    photoComments: function(callback) {
      conn.query("SELECT photo_comments.id, photo_comments.comments, photo_comments.photo_id, DATE_FORMAT( photo_comments.post_time, '%M %d, %Y at %l:%i %p' ) AS post_time, users.name FROM photo_comments JOIN userlog ON userlog.login = photo_comments.login_id JOIN users ON users.username = userlog.name JOIN photos on photos.id = photo_comments.photo_id WHERE photo_comments.photo_id = ?", [req.params.id], function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          var photoComments = rows;

          // Check if any of the comments belong to the logged in user
          for (var i=0;i<photoComments.length;i++) {
            if (photoComments[i].name == req.session.full_name) {
              photoComments[i].belongs_to = 'true';
            }
          }

          callback(null, photoComments);
        }
      });
    },
    result: function(callback) {
      conn.query("SELECT DISTINCT photos.id, photos.title, photos.ummp, photos.type_specimen, photos.stage, photos.containing_stage, photos.chron_id, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) FROM taxa WHERE taxa.photo_id = photos.id) as taxa FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id JOIN taxa ON taxa.photo_id = photos.id WHERE photos.id = ? LIMIT  0,20", [req.params.id],
        function(err, rows, fields) {
        if (err) {
          callback(err);
        } else if (rows.length < 1) {
          callback("none");
        } else {
          // Check if this entry belonds to the logged in user
          if (rows[0].name === req.session.full_name) {
            rows[0].belongs_to = 'true';
          }

          callback(null, rows);
        }
          
      });
    }
  }, 
  function(error, result) {
    if (error) {
      console.log("viewrecord - ", error);
      res.redirect("/");
    } else {
      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }

      res.render('viewrecord', {
        login: login_id, 
        result: result.result, 
        mapdata: JSON.stringify(result.mapdata), 
        comments: result.photoComments,
        partials: {
          "navbar": "navbar",
          "footer": "footer"
        }
      });
    }
  });
}

exports.findByCounty = function(req, res) {
  if (typeof req.query.limit === 'undefined') {
    req.query.limit = 0;
  }

  if (typeof req.session.query === 'undefined' || req.query.home == "true") {
    conn.query("SELECT DISTINCT photos.id, photos.title, users.name, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) FROM taxa WHERE taxa.photo_id = photos.id) as taxon FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + projectWhere +" and locals_mod2.county_fips = ? LIMIT " + req.query.limit + ", 20", [req.params.id], function(err, rows, fields) {
      if (err) {
        console.log("findByCounty - ", err);
        res.jsonp([]);
      } else {
        res.jsonp(rows);
      }
    });
  } else {
    conn.query("SELECT DISTINCT photos.id, photos.title, users.name, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) from taxa WHERE taxa.photo_id = photos.id) as taxon FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + req.session.query + " AND " + projectWhere + " AND locals_mod2.county_fips = ? LIMIT " + req.query.limit + ", 20", [req.params.id], function(err, rows, fields) {

      if (err) {
        console.log("findByCounty - ", err);
        res.jsonp([]);
      } else {
        res.jsonp(rows);
      }
    });
  }
};

exports.photoTaxa = function(req, res) {
  conn.query('SELECT taxon, species from taxa where photo_id = ?', [req.query.photo_id], function(error, data) {
    res.jsonp(data);
  });
}

// Used to process and render /search routes AFTER the initial POST (never called first, except for Phylum from homepage)
exports.searchApp = function(req, res) {
  async.waterfall([
    function(callback) {
      // Grab the requested page from the URL, and put it in a variable for ease of access
      if (!req.query.page){
        var page = 1;
      } else {
        var page = req.query.page;
      }

      var numParams = Object.keys(req.query).length;
      // Give advantage to URL params over cookie
      if (!req.query.page && numParams > 0) {
        // Get URL parmams here
        var params = req.query;
        processQuery(params, req, res, page);
      } else if (req.query.page && numParams > 1) {
        // Get URL params and ignore page
        var params = req.query;
        processQuery(params, req, res, page);
      } else if (typeof req.session.search === "undefined") {
        // If no params and no cookie
        res.redirect("/");
      } else {
        // If no URL params besides page, fall back to session cookie
        var query = req.session.query;

        callback(null, page, query);
      }
    },

    function(page, query, callback) {
      if (req.session.hits > 19) {
        var limitb = parseInt(page) * 20,
            limita = limitb - 20;

        callback(null, limita, limitb, query);
      } else if (req.session.hits < 1) {
        var limit = [{"header": "No records found"}],
            pages = [];

        res.render('searchResults', {
          limits: limit, 
          pages: pages,
          partials: {
            "head": "head_leaflet",
            "navbar": "navbar",
            "footer": "footer"
          }
        });
      } else {
        var limitb = req.session.hits,
            limita = 0;
        callback(null, limita, limitb, query);
      }
    },

    function(limita, limitb, query, callback) {
      var tempA = limita + 1;
      if (limitb > req.session.hits) {
        limitb = req.session.hits;
      }
      var limit = [{"header": "Currently showing records " + tempA + " - " + limitb + " of " + req.session.hits + " total"}];

      // If < 20 results, don't create pagination
      if (req.session.pages == 1) {
        var pages = [];

      // If less than 5 pages, do this
      } else if (req.session.pages < 5) {
        var small = "yes";

        if (!req.query.page) {
          req.query.page = 1;
        }
        // On the last page
        if (req.query.page == req.session.pages) {
          var previous = req.query.page -1,
              nextPage = "",
              firstPage = "",
              lastPage = "yes";
        // On the first page
        } else if (req.query.page == 1) {
          var previous = "",
              nextPage = 2,
              firstPage = "yes",
              lastPage = "";
        // On any other page
        } else {
          var previous = req.query.page - 1,
              nextPage = req.query.page + 1
              firstPage = "",
              lastPage = "";
        }

        previous = parseInt(previous);

        var pages = [{"pagination":[]}];
        for (var i = 1; i < req.session.pages + 1; i++) {
          pages[0].pagination.push({"pageurl" : "/search?page=" + i});
          pages[0].pagination[i-1]["pageid"] = i;
          if (i == req.query.page) {
            pages[0].pagination[i-1]["active"] = "yes";
          }
        }

        pages[0]["previous"] = "/search?page=" + previous;
        pages[0]["next"] = "/search?page=" + nextPage;
        pages[0]["small"] = small;
        pages[0]["firstPage"] = firstPage;
        pages[0]["lastPage"] = lastPage;

      // If more than 5 pages, do this
      } else {
        var small = "";
        if (!req.query.page) {
          req.query.page = 1;
        }
        // On the last page
        if (req.query.page == req.session.pages) {
          var previous = req.query.page -1,
              middlepage = req.session.pages - 2,
              nextPage = "",
              firstPage = "",
              lastPage = "yes";
        // On the first page
        } else if (req.query.page == 1) {
          var previous = "",
              middlepage = 3,
              nextPage = 2,
              firstPage = "yes",
              lastPage = "";
        // On the second to last page
        } else if (req.query.page == parseInt(req.session.pages - 1)) {
          var previous = req.query.page -1,
              middlepage = req.session.pages - 2,
              nextPage = req.session.pages,
              firstPage = "",
              lastPage = "";
         // On any page greater than 3
        } else if (req.query.page > 3) {
          var previous = req.query.page - 1,
              middlepage = req.query.page;
              nextPage = parseInt(req.query.page) + 1
              firstPage = "",
              lastPage = "";
        // On page 2 or 3
        } else {
          var previous = req.query.page - 1,
              middlepage = 3;
              nextPage = parseInt(req.query.page) + 1
              firstPage = "",
              lastPage = "";
        }

        middlepage = parseInt(middlepage);

        var urlString = req.url;
        urlString = urlString.replace(/&page=\d+/g, '').replace(/\\?page=\d+/g, '').replace(/\?&/g, '?');

        var pages = [{"pagination":[]}],
        pageCounter = middlepage - 2;
        for (var i = 1; i < 6; i++) {
          pages[0].pagination.push({"pageurl" : urlString + "&page=" + pageCounter});
          pages[0].pagination[i-1]["pageid"] = pageCounter;
          if (pageCounter == req.query.page) {
            pages[0].pagination[i-1]["active"] = "yes";
          }
          pageCounter++;
        }

        pages[0]["lastpageurl"] = urlString + "&page=" + req.session.pages;
        pages[0]["lastpageid"] = req.session.pages;
        pages[0]["previous"] = urlString + "&page=" + parseInt(previous);
        pages[0]["first"] = urlString + "&page=" + 1;
        pages[0]["next"] = urlString + "&page=" + parseInt(nextPage);

        pages[0]["small"] = small;
        pages[0]["firstPage"] = firstPage;
        pages[0]["lastPage"] = lastPage;

      } // end pagination Else
      callback(null, limit, limita, limitb, pages, query);
    },

    function(limit, limita, limitb, pages, query, callback) {
      conn.query("SELECT COUNT(distinct photos.id) as photos, COUNT(distinct taxa.taxon) as genera, COUNT(distinct case when photos.type_specimen != '' THEN photos.type_specimen END) as type_specimen, locals_mod2.county_fips as fips, (GROUP_CONCAT(DISTINCT ' ',strat.unit)) as strat FROM photos  JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id JOIN strat ON strat.id = photos.strat_id WHERE " + query + " GROUP BY locals_mod2.county_fips", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var mapdata = rows;
        callback(null, limit, limita, limitb, pages, query, mapdata);
      });
    },

    function(limit, limita, limitb, pages, query, mapdata, callback) {
      conn.query("SELECT DISTINCT photos.id, photos.title, photos.ummp, photos.type_specimen, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) from taxa WHERE taxa.photo_id = photos.id) as taxa FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query + " LIMIT " + limita + ",20", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var result = rows;
        callback(null, result, limit, pages, mapdata);
      });
    }

  ], function(error, result, limit, pages, mapdata) {
    if (error) {
      console.log("searchApp - ", error);
      res.redirect("/");
    } else {
      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }
      res.render('searchResults', {
        "login": login_id, 
        "result": result, 
        "limits": limit, 
        "pages": pages, 
        "mapdata": JSON.stringify(mapdata),
        "partials": {
          "head": "head_leaflet",
          "navbar": "navbar",
          "footer": "footer"
        }
      });
    }
  });
}; // End searchApp

// Used to process and render /search routes AFTER the initial POST (never called first, except for Phylum from homepage)
exports.simpleSearch = function(req, res) {
  async.waterfall([
    function(callback) {
      // Grab the requested page from the URL, and put it in a variable for ease of access
      var page = req.query.page;

      if (typeof req.session.search == 'undefined') {
        res.send("<h3>404</h3><p>Search undefined - please enter a new search</p>", 404);
      } else {
        // Retrieve the search query from the cookie
        var query = req.session.query;

        // Start processing the query
        callback(null, page, query);
      }
    },

    function(page, query, callback) {
      if (req.session.hits > 19) {
        var limitb = parseInt(page) * 20,
            limita = limitb - 20;

        callback(null, page, query, limita, limitb);

      } else if (req.session.hits < 1) {
        var limit = [{"header": "No records found"}],
            pages = [];

        res.render('searchResults', {
          limits: limit, 
          pages: pages,
          partials: {
            "head": "head_leaflet",
            "navbar": "navbar",
            "footer": "footer"
          }
        });
      } else {
        var limitb = req.session.hits,
            limita = 0;
        callback(null, page, query, limita, limitb);
      }
    },

    function(page, query, limita, limitb, callback) {
      var tempA = limita + 1;
      if (limitb > req.session.hits) {
        limitb = req.session.hits;
      }
      var limit = [{"header": "Currently showing records " + tempA + " - " + limitb + " of " + req.session.hits + " total"}];

      // If < 20 results, don't create pagination
      if (req.session.pages == 1) {
        var pages = [];

      // If less than 5 pages, do this
      } else if (req.session.pages < 5) {
        var small = "yes";

        if (!req.query.page) {
          req.query.page = 1;
        }
        // On the last page
        if (req.query.page == req.session.pages) {
          var previous = req.query.page -1,
              nextPage = "",
              firstPage = "",
              lastPage = "yes";
        // On the first page
        } else if (req.query.page == 1) {
          var previous = "",
              nextPage = 2,
              firstPage = "yes",
              lastPage = "";
        // On any other page
        } else {
          var previous = req.query.page - 1,
              nextPage = req.query.page + 1
              firstPage = "",
              lastPage = "";
        }

        previous = parseInt(previous);

        var urlString = req.url;
        urlString = urlString.replace(/&page=\d+/g, '').replace(/\\?page=\d+/g, '').replace(/\?&/g, '?');

        var pages = [{"pagination":[]}];
        for (var i = 1; i < req.session.pages + 1; i++) {
          pages[0].pagination.push({"pageurl" : urlString + "&page=" + i});
          pages[0].pagination[i-1]["pageid"] = i;
          if (i == req.query.page) {
            pages[0].pagination[i-1]["active"] = "yes";
          }
        }

        pages[0]["previous"] = urlString + "&page=" + previous;
        pages[0]["next"] = urlString + "&page=" + nextPage;
        pages[0]["small"] = small;
        pages[0]["firstPage"] = firstPage;
        pages[0]["lastPage"] = lastPage;

      // If more than 5 pages, do this
      } else {
        var small = "";
        if (!req.query.page) {
          req.query.page = 1;
        }
        // On the last page
        if (req.query.page == req.session.pages) {
          var previous = req.query.page -1,
              middlepage = req.session.pages - 2,
              nextPage = "",
              firstPage = "",
              lastPage = "yes";
        // On the first page
        } else if (req.query.page == 1) {
          var previous = "",
              middlepage = 3,
              nextPage = 2,
              firstPage = "yes",
              lastPage = "";
        // On the second to last page
        } else if (req.query.page == parseInt(req.session.pages - 1)) {
          var previous = req.query.page -1,
              middlepage = req.session.pages - 2,
              nextPage = req.session.pages,
              firstPage = "",
              lastPage = "";
         // On any page greater than 3
        } else if (req.query.page > 3) {
          var previous = req.query.page - 1,
              middlepage = req.query.page;
              nextPage = parseInt(req.query.page) + 1
              firstPage = "",
              lastPage = "";
        // On page 2 or 3
        } else {
          var previous = req.query.page - 1,
              middlepage = 3;
              nextPage = parseInt(req.query.page) + 1
              firstPage = "",
              lastPage = "";
        }

        middlepage = parseInt(middlepage);

        var urlString = req.url;
        urlString = urlString.replace(/&page=\d+/g, '').replace(/\\?page=\d+/g, '').replace(/\?&/g, '?');

        var pages = [{"pagination":[]}],
        pageCounter = middlepage - 2;
        for (var i = 1; i < 6; i++) {
          pages[0].pagination.push({"pageurl" : urlString + "&page=" + pageCounter});
          pages[0].pagination[i-1]["pageid"] = pageCounter;
          if (pageCounter == req.query.page) {
            pages[0].pagination[i-1]["active"] = "yes";
          }
          pageCounter++;
        }

        pages[0]["lastpageurl"] = urlString + "&page=" + req.session.pages;
        pages[0]["lastpageid"] = req.session.pages;
        pages[0]["previous"] = urlString + "&page=" + parseInt(previous);
        pages[0]["first"] = urlString + "&page=" + 1;
        pages[0]["next"] = urlString + "&page=" + parseInt(nextPage);

        pages[0]["small"] = small;
        pages[0]["firstPage"] = firstPage;
        pages[0]["lastPage"] = lastPage;

      } // end pagination Else

      callback(null, page, query, limita, limitb, limit, pages);
    },

    function(page, query, limita, limitb, limit, pages, callback) {
      conn.query("SELECT COUNT(distinct photos.id) as photos, COUNT(distinct taxa.taxon) as genera, COUNT(distinct case when photos.type_specimen != '' THEN photos.type_specimen END) as type_specimen, locals_mod2.county_fips as fips, (GROUP_CONCAT(DISTINCT ' ',strat.unit)) as strat FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query + " GROUP BY locals_mod2.county_fips", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var mapdata = rows;
        callback(null, page, query, limita, limitb, limit, pages, mapdata);
      });
    },

    function(page, query, limita, limitb, limit, pages, mapdata, callback) {
      conn.query("SELECT DISTINCT photos.id, photos.title, photos.ummp, photos.type_specimen, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) from taxa WHERE taxa.photo_id = photos.id) as taxa FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query + " LIMIT " + limita + ",20", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var result = rows;
        callback(null, result, limit, pages, mapdata);
      });
    }

  ], function(error, result, limit, pages, mapdata) {
    if (error) {
      console.log("simpleSearch - ", error);
      res.redirect("/");
    } else {
      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }

      res.render('searchResults', {
        "login": login_id, 
        "result": result, 
        "limits": limit, 
        "pages": pages, 
        "mapdata": JSON.stringify(mapdata),
        "partials": {
          "head": "head_leaflet",
          "navbar": "navbar",
          "footer": "footer"
        }
      });
    }
  });
}; // End simpleSearch

exports.searchRecent = function(req, res) {
  req.session.query = undefined;
  async.waterfall([
    function(callback) {
      // Reset our session query
      req.session.query = undefined;
      var page = req.query.page;

      conn.query('SELECT COUNT(photos.id) as count FROM photos ' + projectJoin +' WHERE ' + projectWhere + '', function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var limitb = page * 20,
            limita = limitb - 20,
            records = rows;

        callback(null, page, limita, limitb, records);
      });
    },

    function(page, limita, limitb, records, callback) {
      var tempA = limita + 1;
      if (limitb > records[0].count) {
        limitb = records[0].count;
      }

      var limit = [{"header": "Currently showing records " + tempA + " - " + limitb + " of " + records[0].count + " total"}];

      req.session.hits = records[0].count;
      req.session.pages = Math.ceil(records[0].count / 20);

      var small = "";
      if (!req.query.page) {
        req.query.page = 1;
      }
      // On the last page
      if (req.query.page == req.session.pages) {
        var previous = req.query.page -1,
            middlepage = req.session.pages - 2,
            nextPage = "",
            firstPage = "",
            lastPage = "yes";
      // On the first page
      } else if (req.query.page == 1) {
        var previous = "",
            middlepage = 3,
            nextPage = 2,
            firstPage = "yes",
            lastPage = "";
      // On the second to last page
      } else if (req.query.page == parseInt(req.session.pages - 1)) {
        var previous = req.query.page -1,
            middlepage = req.session.pages - 2,
            nextPage = req.session.pages,
            firstPage = "",
            lastPage = "";
       // On any page greater than 3
      } else if (req.query.page > 3) {
        var previous = req.query.page - 1,
            middlepage = req.query.page;
            nextPage = parseInt(req.query.page) + 1
            firstPage = "",
            lastPage = "";
      // On page 2 or 3
      } else {
        var previous = req.query.page - 1,
            middlepage = 3;
            nextPage = parseInt(req.query.page) + 1
            firstPage = "",
            lastPage = "";
      }

      middlepage = parseInt(middlepage);

      var urlString = req.url;
      urlString = urlString.replace(/&page=\d+/g, '').replace(/\\?page=\d+/g, '').replace(/\?&/g, '?');

      var pages = [{"pagination":[]}],
      pageCounter = middlepage - 2;
      for (var i = 1; i < 6; i++) {
        pages[0].pagination.push({"pageurl" : urlString + "&page=" + pageCounter});
        pages[0].pagination[i-1]["pageid"] = pageCounter;
        if (pageCounter == req.query.page) {
          pages[0].pagination[i-1]["active"] = "yes";
        }
        pageCounter++;
      }

      pages[0]["lastpageurl"] = urlString + "&page=" + req.session.pages;
      pages[0]["lastpageid"] = req.session.pages;
      pages[0]["previous"] = urlString + "&page=" + parseInt(previous);
      pages[0]["first"] = urlString + "&page=" + 1;
      pages[0]["next"] = urlString + "&page=" + parseInt(nextPage);

      pages[0]["small"] = small;
      pages[0]["firstPage"] = firstPage;
      pages[0]["lastPage"] = lastPage;

      callback(null, page, limit, limita, limitb, pages, records);
    },

    function(page, limit, limita, limitb, pages, records, callback) {
      conn.query("SELECT count(photos.id) AS photos,count(distinct taxa.taxon) AS genera,(SELECT count(distinct photos.id) from photos where type_specimen not like '') AS type_specimen,locals_mod2.county_fips AS fips,group_concat(distinct ' ',strat.unit separator ',') AS strat FROM photos JOIN userlog ON userlog.login=photos.login_id JOIN locals_mod2 on locals_mod2.id = photos.local_id JOIN taxa on taxa.photo_id = photos.id JOIN strat on strat.id = photos.strat_id WHERE " + projectWhere+ " GROUP BY locals_mod2.county_fips", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var mapdata = rows;
        callback(null, page, limit, limita, limitb, pages, mapdata);
      });
    },

    function(page, limit, limita, limitb, pages, mapdata, callback) {
      conn.query("SELECT photos.id, photos.title, photos.ummp, photos.type_specimen, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) from taxa WHERE taxa.photo_id = photos.id) as taxa FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id WHERE " + projectWhere+ " ORDER BY date DESC LIMIT " + limita + ",20", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var results = rows;
        callback(null, results, limit, pages, mapdata); 
      });
    }

  ], function(error, results, limit, pages, mapdata) {

    if (error) {
      console.log("searchRecent - ", error);
      res.redirect("/");
    } else {
      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }

      res.render('searchResults', {
        "login": login_id, 
        "result": results, 
        "limits": limit, 
        "pages": pages, 
        "mapdata": JSON.stringify(mapdata),
        "partials": {
          "head": "head_leaflet",
          "navbar": "navbar",
          "footer": "footer"
        }
      });
    }
  });
}

function processQuery(params, req, res, page) {
  async.waterfall([
    function(callback) {
      var query,
          where;

      if (params.pid) {
        query = "photos.id=" + params.pid;
        // If the photo id is known, skip to the end
      } else {

        if (params.title) {
          where = "photos.title like '%" + params.title + "%'";
        }

        if (params.itype) {
          if (typeof where !== 'undefined') {
            where += " and image_type='" + params.itype + "'";
          } else {
            where = "image_type='" + params.itype + "'";
          }
        }

        if (params.ttype) {
          if (typeof where !== 'undefined') {
            where += " and type_specimen='" + params.ttype + "'";
          } else {
            where = "type_specimen='" + params.ttype + "'";
          }
        }

        if (params.alltype == 1) {
          if (typeof where !== 'undefined') {
            where += " and type_specimen not like ''";
          } else {
            where = "type_specimen not like ''";
          }
        }

        if (params.ummp) {
          if (typeof where !== 'undefined') {
            where += " and ummp like 'ummp'";
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

        if (params.mb) {
          where = "strat_id=(SELECT id FROM strat WHERE unit = '" + params.mb + "')";
        } else if (params.fm) {
          where = "(strat_id=(SELECT id FROM strat WHERE unit = '" + params.fm + "')" + " or strat_id in (SELECT id from strat where belongs_to=(SELECT id FROM strat WHERE unit = '" + params.fm + "')))";
        } else if (params.gr) {
          where = "(strat_id=(SELECT id FROM strat WHERE unit = '" + params.gr + "')" + " or strat_id in (SELECT id from strat where belongs_to=(SELECT id from strat WHERE unit = '" + params.gr + "') or belongs_to in (SELECT id from strat where belongs_to=(SELECT id FROM strat WHERE unit = '" + params.gr + "'))))";
        }

        if (params.chron_id) {
          if (typeof where !== 'undefined') {
            where += " and photos.chron_id = " + params.chron_id;
          } else {
            where = "photos.chron_id = " + params.chron_id;
          }
        }
        /*
        if (params.mb) {
          where = "strat_id=" + params.mb;
        } else if (params.fm) {
          where = "(strat_id=" + params.fm + " or strat_id in (SELECT id from strat where belongs_to=" + params.fm + "))";
        } else if (params.gr) {
          where = "(strat_id=" + params.gr + " or strat_id in (SELECT id from strat where belongs_to=" + params.gr + " or belongs_to in (SELECT id from strat where belongs_to=" + params.gr + ")))";
        }
    */
        if (typeof where !== 'undefined') {
          if (typeof query !== 'undefined') {
            query += " and photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and " + where + ")";
          } else {
            query = "photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and " + where + ")";
          }
        }

        where = undefined;

        if (params.comments) {
          where = "photo_comments.comments like '%" + params.comments + "%'";
          if (typeof query !== 'undefined') {
            query += " and photos.id in (SELECT photo_id from photo_comments where " + where + ")";
          } else {
            query = "photos.id in (SELECT photo_id from photo_comments where " + where + ")";
          }
        }

        where = undefined;

        if (params.comm_contrib) {
          where = "users.name='" + params.comm_contrib + "'";
          if (typeof query !== 'undefined') {
            query += " and photos.id in (SELECT photo_id from photo_comments,userlog,users where photo_comments.login_id=userlog.login and userlog.name=users.username and " + where + ")";
          } else {
            query = "photos.id in (SELECT photo_id from photo_comments,userlog,users where photo_comments.login_id=userlog.login and userlog.name=users.username and " + where + ")";
          }
        }

        where = undefined;

        if (params.notes) {
          where = "photo_notes.notes like '%" + params.notes + "%'";
          if (typeof query !== 'undefined') {
            query += " and photos.id in (SELECT photo_id from photo_notes where " + where + ")";
          } else {
            query = "photos.id in (SELECT photo_id from photo_notes where " + where + ")";
          }
        }

        where = undefined;

        if (params.contrib) {
          where = "users.name='" + params.contrib + "'";
          if (typeof query !== 'undefined') {
            query += " and photos.id in (SELECT photos.id from photos,userlog,users where photos.login_id=userlog.login and userlog.name=users.username and hide_me=0 and " + where + ")";
          } else {
            query = "photos.id in (SELECT photos.id from photos,userlog,users where photos.login_id=userlog.login and userlog.name=users.username and hide_me=0 and " + where + ")";
          }
        }

        where = undefined;

        if (params.st) {
          where = "chron_id=" + params.st;
        } else if (params.ep) {
          where = "(chron_id=" + params.ep + " or chron_id in (SELECT id from chron where chron.belongs_to=" + params.ep + "))";
        } else if (params.pr) {
          where = "(chron_id=" + params.pr + " or chron_id in (SELECT id from chron where chron.belongs_to=" + params.pr + " or chron.belongs_to in (SELECT id from chron where belongs_to=" + params.pr + ")))";
        }

        if (typeof where !== 'undefined') {
          if (typeof query !== 'undefined') {
            query += " and photos.id in (SELECT photos.id from photos,strat,chron where photos.strat_id=strat.id and strat.chron_id=chron.id and " + where + ")";
          } else {
            query = "photos.id in (SELECT photos.id from photos,strat,chron where photos.strat_id=strat.id and strat.chron_id=chron.id and " + where + ")";
          }
        }

        where = undefined;

        if (params.city) {
          where = "locals.city='" + params.city + "'";
        }

        if (params.county) {
          if (typeof where !== 'undefined') {
            where += " and locals.county='" + params.county + "'";
          } else {
            where = "locals.county='" + params.county + "'";
          }
        }

        if (params.state) {
          if (typeof where !== 'undefined') {
            where += " and locals.state='" + params.state + "'";
          } else {
            where = "locals.state='" + params.state + "'";
          }
        }

        if (params.taxon) {
          if (typeof where !== 'undefined'){
            where += " and taxa.taxon LIKE '%" + params.taxon + "%'";
          } else {
            where = "taxa.taxon LIKE '%" + params.taxon + "%'";
          }
        }

        if (params.species) {
          if (typeof where !== 'undefined'){
            where += " and taxa.species LIKE '%" + params.species + "%'";
          } else {
            where = "taxa.species LIKE '%" + params.species + "%'";
          }
        }

        if (typeof where !== 'undefined') {
          if (typeof query !== 'undefined') {
            query += " and photos.id in (SELECT photos.id from photos,locals where photos.local_id=locals.id and " + where + ")";
          } else {
            query = "photos.id in (SELECT photos.id from photos,locals where photos.local_id=locals.id and " + where + ")";
          }
        }

        where = undefined;

      // Store the query in a session variable for use by GET routers
      req.session.query = query;

      callback(null, query);
     }
    },

    function(query, callback) {
      // Query to find the number of results (mostly checking if greater or less than 20)
      conn.query("SELECT COUNT(DISTINCT photos.id) as count, IF(((SELECT COUNT(*) from photos WHERE " + query + ") > 20), 20, (SELECT COUNT(*) from photos WHERE " + query + ")) as test FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query, function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var records = rows;
        // This is true if more than 20 records are found
        if (records[0].test == 20) {
          var limitb = page * 20,
              limita = limitb - 20;

          callback(null, limita, limitb, records, query);

        // If no records are found, stop and send a response indicating so
        } else if (records[0].test < 1) {

          var limit = [{"header": "No records found"}],
              pages = [];
          req.session.hits = records[0].count;
          
          res.render('searchResults', {
            limits: limit, 
            pages: pages,
            partials: {
              "head": "head_leaflet",
              "navbar": "navbar",
              "footer": "footer"
            }
          });
        } else {
          var limitb = records[0].count,
              limita = 0;
          callback(null, limita, limitb, records, query);
        }
      });
    },

    function(limita, limitb, records, query, callback) {
      var tempA = limita + 1;
      if (limitb > records[0].count) {
        limitb = records[0].count;
      }
      var limit = [{"header": "Currently showing records " + tempA + " - " + limitb + " of " + records[0].count + " total"}];

      req.session.hits = records[0].count;
      req.session.pages = Math.ceil(records[0].count / 20);

      // If < 20 results, don't create pagination
      if (req.session.pages == 1) {
        var pages = [];

      // If less than 5 pages, do this
      } else if (req.session.pages < 5) {
        var small = "yes";

        if (!req.query.page) {
          req.query.page = 1;
        }
        // On the last page
        if (req.query.page == req.session.pages) {
          var previous = req.query.page -1,
              nextPage = "",
              firstPage = "",
              lastPage = "yes";
        // On the first page
        } else if (req.query.page == 1) {
          var previous = "",
              nextPage = 2,
              firstPage = "yes",
              lastPage = "";
        // On any other page
        } else {
          var previous = req.query.page - 1,
              nextPage = parseInt(req.query.page) + 1
              firstPage = "",
              lastPage = "";
        }

        previous = parseInt(previous),
        nextPage = parseInt(nextPage);

        var urlString = req.url;
        urlString = urlString.replace(/&page=\d+/g, '').replace(/\\?page=\d+/g, '').replace(/\?&/g, '?');

        var pages = [{"pagination":[]}];
        for (var i = 1; i < req.session.pages + 1; i++) {
          pages[0].pagination.push({"pageurl" : urlString + "&page=" + i});
          pages[0].pagination[i-1]["pageid"] = i;
          if (i == req.query.page) {
            pages[0].pagination[i-1]["active"] = "yes";
          }
        }

        pages[0]["previous"] = urlString + "&page=" + previous;
        pages[0]["next"] = urlString + "&page=" + parseInt(nextPage);
        pages[0]["small"] = small;
        pages[0]["firstPage"] = firstPage;
        pages[0]["lastPage"] = lastPage;

      // If more than 5 pages, do this
      } else {
        var small = "";
        if (!req.query.page) {
          req.query.page = 1;
        }
        // On the last page
        if (req.query.page == req.session.pages) {
          var previous = req.query.page -1,
              middlepage = req.session.pages - 2,
              nextPage = "",
              firstPage = "",
              lastPage = "yes";
        // On the first page
        } else if (req.query.page == 1) {
          var previous = "",
              middlepage = 3,
              nextPage = 2,
              firstPage = "yes",
              lastPage = "";
        // On the second to last page
        } else if (req.query.page == parseInt(req.session.pages - 1)) {
          var previous = req.query.page -1,
              middlepage = req.session.pages - 2,
              nextPage = req.session.pages,
              firstPage = "",
              lastPage = "";
         // On any page greater than 3
        } else if (req.query.page > 3) {
          var previous = req.query.page - 1,
              middlepage = req.query.page;
              nextPage = parseInt(req.query.page) + 1
              firstPage = "",
              lastPage = "";
        // On page 2 or 3
        } else {
          var previous = req.query.page - 1,
              middlepage = 3;
              nextPage = parseInt(req.query.page) + 1
              firstPage = "",
              lastPage = "";
        }

        middlepage = parseInt(middlepage);

        var urlString = req.url;
        urlString = urlString.replace(/&page=\d+/g, '').replace(/\\?page=\d+/g, '').replace(/\?&/g, '?');

        var pages = [{"pagination":[]}],
        pageCounter = middlepage - 2;
        for (var i = 1; i < 6; i++) {
          pages[0].pagination.push({"pageurl" : urlString + "&page=" + pageCounter});
          pages[0].pagination[i-1]["pageid"] = pageCounter;
          if (pageCounter == req.query.page) {
            pages[0].pagination[i-1]["active"] = "yes";
          }
          pageCounter++;
        }

        pages[0]["lastpageurl"] = urlString + "&page=" + req.session.pages;
        pages[0]["lastpageid"] = req.session.pages;
        pages[0]["previous"] = urlString + "&page=" + parseInt(previous);
        pages[0]["first"] = urlString + "&page=" + 1;
        pages[0]["next"] = urlString + "&page=" + parseInt(nextPage);

        pages[0]["small"] = small;
        pages[0]["firstPage"] = firstPage;
        pages[0]["lastPage"] = lastPage;

      } // end pagination Else

      callback(null, limit, limita, limitb, pages, query);
    },

    function(limit, limita, limitb, pages, query, callback) {
      conn.query("SELECT COUNT(distinct photos.id) as photos, COUNT(distinct taxa.taxon) as genera, COUNT(distinct case when photos.type_specimen != '' THEN photos.type_specimen END) as type_specimen, locals_mod2.county_fips as fips, (GROUP_CONCAT(DISTINCT ' ',strat.unit)) as strat FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id JOIN strat ON strat.id = photos.strat_id WHERE " + query + " GROUP BY locals_mod2.county_fips", function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          var mapdata = rows;
          callback(null, limit, limita, pages, query, mapdata);
        }
      });
    },

    function(limit, limita, pages, query, mapdata, callback) {
      conn.query("SELECT DISTINCT photos.id, photos.title, photos.ummp, photos.type_specimen, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) from taxa WHERE taxa.photo_id = photos.id) as taxa FROM photos JOIN locals_mod2 ON locals_mod2.id = photos.local_id JOIN strat ON strat.id = photos.strat_id JOIN userlog ON userlog.login = photos.login_id JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query + " LIMIT " + limita + ",20", function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          var result = rows;
          callback(null, result, limit, pages, mapdata);
        }
      });
    }

  ], function(error, result, limit, pages, mapdata) {
    if (error) {
      console.log("processQuery - ", error);
      res.redirect("/");
    } else {
      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }

      res.render('searchResults', {
        "login": login_id,
        "result": result,
        "limits": limit, 
        "pages": pages, 
        "mapdata": JSON.stringify(mapdata),
        "partials": {
          "head": "head_leaflet",
          "navbar": "navbar",
          "footer": "footer"
        }
      });
    }
  });
} // end processQuery
