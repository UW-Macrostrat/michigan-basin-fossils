var easyimg = require('easyimage'),
    fs = require('fs'),
    async = require('async'),
    config = require('./config');

exports.login = function(req, res) {
  conn.query('SELECT id, name FROM users WHERE username = ? && password = PASSWORD(?)', [req.body.user, req.body.password], function(error, result) {
    if (error) {
      res.send('500: Internal Server Error', 500);
    }
    if (result.length > 0) {
      req.session.user_id = req.body.user;
      req.session.full_name = result[0].name;
      var ipAddress = req.header('x-forwarded-for') || req.connection.remoteAddress;

      var d = new Date(),
          year = d.getFullYear(),
          month = d.getMonth() + 1,
          day = d.getDate(),
          hours = d.getHours(),
          minutes = d.getMinutes(),
          seconds = d.getSeconds(),
          fullDate = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;

      var post = {
        "ip": ipAddress, 
        "project_id": config.project_id, 
        "name": req.session.user_id, 
        "date": year + "-" + month + "-" + day, 
        "time": hours + ":" + minutes + ":" + seconds, 
        "time_start": fullDate, 
        "time_end": "0000-00-00 00:00:00",
        "project_id": config.project_id
      };

      conn.query('INSERT INTO userlog SET ?', post, function(err, rows, fields) {
        if (err) {
          console.log("Login - ", err);
        } else {
          req.session.uid = rows.insertId;
          res.redirect('back');
        }
      });
    } else {
      res.send("Bad user and/or password");
    }
  });
}

exports.comment = function(req, res) {
  var d = new Date(),
        year = d.getFullYear(),
        month = d.getMonth() + 1,
        day = d.getDate(),
        hours = d.getHours(),
        minutes = d.getMinutes(),
        seconds = d.getSeconds(),
        fullDate = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;

  var post = {photo_id: req.body.photoID, comments: req.body.comments, login_id: req.session.uid, post_time: fullDate};
  conn.query('INSERT INTO photo_comments SET ?', post, function(err, rows, fields) {
    res.redirect('back');
  });
}

exports.editComment = function(req, res) {
  var d = new Date(),
      year = d.getFullYear(),
      month = d.getMonth() + 1,
      day = d.getDate(),
      hours = d.getHours(),
      minutes = d.getMinutes(),
      seconds = d.getSeconds(),
      fullDate = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;

  conn.query('UPDATE photo_comments SET comments = ?, post_time = ? WHERE id = ?', [req.body.comments, fullDate, req.body.commentID], function(err, rows, fields) {
    if (err) {
      console.log("editComment - ", err);
    }
    res.redirect('back');
  });
}

exports.deleteComment = function(req, res) {
  conn.query('DELETE FROM photo_comments WHERE id = ?', req.body.commentID, function(err, result) {
    res.redirect('back');
  });
}

exports.deleteRecord = function(req, res) {
  async.waterfall([
    function(callback) {
      conn.query('SELECT DISTINCT photos.id, users.name FROM photos LEFT OUTER JOIN userlog ON userlog.login = photos.login_id LEFT OUTER JOIN users ON users.username = userlog.name WHERE photos.id = ?', [req.params.id], function(err, rows, fields) {
        if (rows[0].name != req.session.full_name) {
          callback("error", null);
        } else {
          callback(null);
        }
      })
    },

    function(callback) {
      conn.query('DELETE FROM photos WHERE id = ?', [req.params.id], function(err, rows, fields) {
        if (err) {
          console.log("Error deleting from table photos - ", err);
        } else {
          callback(null);
        }
      });
    },

    function(callback) {
      conn.query('DELETE FROM photo_notes WHERE photo_id = ?', [req.params.id], function(err, rows, fields) {
        if (err) {
          console.log("Error deleting from table photo_notes - ", err);
        } else {
          callback(null);
        }
      });
    },

    function(callback) {
      conn.query('DELETE FROM taxa WHERE photo_id = ?', [req.params.id], function(err, rows, fields) {
        if (err) {
          console.log("Error deleting from table taxa - ", err);
        } else {
          callback(null);
        }
      });
    },

    function(callback) {
      conn.query('DELETE FROM photo_comments WHERE photo_id = ?', [req.params.id], function(err, rows, fields) {
        if (err) {
          console.log("Error deleting from table photo_comments - ", err);
        } else {
          callback(null);
        }
      });
    }
  ], function(error, result) {
    if (error) {
      res.send("You are not authorized to edit this record");
    } else {
      res.redirect('/');
    }
  });
}

exports.upload = function(req, res) {
  var dateString = new Date().toISOString();
  dateString  = dateString .substring(0, dateString.indexOf('T'));

  async.waterfall([
    function(callback) {
      if (req.body.city) {
        location = req.body.city + ", " + req.body.county + ", " + req.body.state;
        conn.query('SELECT id FROM locals_mod2 WHERE city = ? AND county = ? AND state = ? LIMIT 1', [req.body.city, req.body.county, req.body.state], function(err, rows, fields) {
          if (err) {
            console.log("upload step 1 - ", err);
            callback(err);
          } else {
            // ! Add check to make sure this returned something ! //
            var localID = rows[0].id;
            callback(null, localID);
          }
        });
      } else {
        location = req.body.county + ", " + req.body.state;
        conn.query('SELECT id FROM locals_mod2 WHERE county = ? AND state = ? LIMIT 1', [req.body.county, req.body.state], function(err, rows, fields) {
          if (err) {
            console.log("upload step 1 - ", err);
            callback(err);
          } else {
            var localID = rows[0].id;
            callback(null, localID);
          }
        });
      }
    },

    function(localID, callback) {
      // Find strat id
      if (req.body.mb) {
        var stratID = req.body.mb;
      } else if (req.body.fm) {
        var stratID = req.body.fm;
      } else if (req.body.gr) {
        var stratID = req.body.gr;
      } else {
        // you messed up error message
      }

      conn.query('SELECT chron_id FROM strat WHERE id = ?', [stratID], function(err, result) {
        if (err) {
          callback(err);
        }
        var chron_id = result[0].chron_id;
        conn.query('SELECT stage, belongs_to FROM chron WHERE id = ?', [chron_id], function(er, data) {
          if (er) {
            callback(er);
          }
          var stage = data[0].stage;
          if (data[0].belongs_to != 0) {
            conn.query('SELECT stage FROM chron WHERE id = ?', [data[0].belongs_to], function(e, data2) {
              if (e) {
                callback(e);
              }
              var containing_stage = data2[0].stage;
              callback(null, localID, stratID, chron_id, stage, containing_stage);
            });
          } else {
            callback(null, localID, stratID, chron_id, stage, '');
          }
          
        });
       
      });
    },

    function(localID, stratID, chron_id, stage, containing_stage, callback) {

      if (req.body.hide_me) {
        var hideMe = 1;
      } else {
        var hideMe = 0;
      }

      var post = {
        orig_name: req.files.photo.name, 
        mb: req.files.photo.size/1000000, 
        title: req.body.title, 
        image_type: req.body.itype, 
        type_specimen: req.body.ttype, 
        cover_pic: 0, 
        ummp: req.body.ummp, 
        local_id: localID, 
        strat_id: stratID, 
        chron_id: chron_id,
        stage: stage,
        containing_stage: containing_stage,
        hide_me: hideMe, 
        login_id: req.session.uid, 
        date: dateString
      };

      conn.query('INSERT INTO photos SET ?', post, function(err, result) {
        if (err) {
          callback(err);
        } else {
          var newId = result.insertId;
          callback(null, newId);
        }
      });
    },
    // Insert comments
    function(newId, callback) {
      if (req.body.notes) {
        var notePost = {photo_id: newId, notes: req.body.notes};
        conn.query('INSERT INTO photo_notes SET ?', notePost, function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, newId);
          }
        });
      } else {
        var notePost = {photo_id: newId, notes: 'None'};
        conn.query('INSERT INTO photo_notes SET ?', notePost, function(err, rows, fields) {
        if (err) {
          callback(err);
        } else {
          callback(null, newId);
        }
        });
      }
    },

    function(newId, callback) {
      var taxa = [];
      for (var i = 1; i < parseInt(req.body.numTaxa) + 1; i++) {
        taxa.push(i);
      }

      async.each(taxa, function(taxon, callback) {
        var t = "t" + taxon,
            tres = "tres" + taxon,
            s = "s" + taxon,
            sres = "sres" + taxon;

        conn.query('SELECT class AS tclass FROM JJS_genera WHERE genus = ?', [req.body[t]], function(err, rows, fields) {
          if (err) {
            callback(err);
          }
          if (rows.length > 0) {
            var classID = rows[0].tclass;
          } else {
            var classID = 0;
          }

          var taxaPost = {
            photo_id: newId, 
            taxon: req.body[t], 
            taxon_reso: req.body[tres], 
            species: req.body[s], 
            species_reso: req.body[sres], 
            class_id: classID, 
            login_id: req.session.uid
          };

          console.log(taxaPost);

          conn.query('INSERT INTO taxa SET ?', taxaPost, function(err, rows, fields) {
            if (err) {
              callback(err);
            } else {
              callback();
            }
          });
        });
      }, function(error) {
        callback(null, newId);
      });


    },

    function(newId, callback) {
      // get the temporary location of the file
      var tmp_path = req.files.photo.path;

      // set where the file should actually exists - in this case it is in the "images" directory
      var target_path = config.imagePath + 'full/' + newId + '.jpg';

      // move the file from the temporary location to the intended location
      fs.rename(tmp_path, target_path, function(err) {
          if (err) {
            console.log("Error renaming new image - ", err);
            callback(err);
          }
          else {
            // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
            /*fs.unlink(tmp_path, function(err) {
              if (err) {
                callback(err);
                console.log("Error deleting original upload - ", err);
              }
            });*/
            // Create medium sized version
            easyimg.resize({src:config.imagePath + 'full/' + newId + '.jpg', dst:config.imagePath + 'main/' + newId + '.jpg', width:450}, function(err, image) {
             if (err) {
                console.log("Error converting to medium sized version - ", err);
                callback(err);
              } else {
                // Create thumbnail version
                easyimg.resize({src:config.imagePath + 'full/' + newId + '.jpg', dst:config.imagePath + 'thumbs/' + newId + '.jpg', width:60}, function(err, image) {
                  if (err) {
                    console.log("Error creating thumbnail version - ", err);
                    callback(err);
                  // If a watermark is requested, add it
                  } else if(req.body.watermark) {
                    // Add watermark to full sized version
                    easyimg.convert({src:config.imagePath + 'full/' + newId + '.jpg', dst:config.imagePath + 'full/' + newId + '.jpg', label: req.session.full_name, size: '55'}, function(err, image) {
                      if (err) {
                        console.log("Error adding watermark to full sized version - ", err);
                        callback(err);
                      } else {
                        // Add watermark to medium sized version
                        easyimg.convert({src:config.imagePath + 'main/' + newId + '.jpg', dst:config.imagePath + 'main/' + newId + '.jpg', label: req.session.full_name, size: '15'}, function(err, image) {
                          if (err) {
                            console.log("Error adding watermark to medium version - ", err);
                            callback(err);
                          } else {
                            callback(null, newId);
                          }
                        });
                      }
                    });
                  } else {
                    callback(null, newId);
                  }
                }); // end create thumbnail
              }
            });
          }
      }); //end rename
    }
  ], function(error, newId) {
    if (error) {
      console.log("upload - ", error);
      res.redirect("/");
    } else {
      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }
      // Render uploadSuccess on completion
      var photo = [{
        "url": "./images/main/" + newId + ".jpg", 
        "orig_name": req.files.photo.name, 
        "size":req.files.photo.size/1000000, 
        "title": req.body.title, 
        "location": location,
        "login": login_id
      }];
      res.render('uploadSuccess', {
        photoInfo: photo,
        partials: {
          "head": "head",
          "navbar": "navbar",
          "footer": "footer"
        }
      });
    }
  });


} // End upload

exports.editRecord = function(req, res) {
  var dateString = new Date().toISOString();
  dateString  = dateString .substring(0, dateString.indexOf('T'));

  async.waterfall([
    function(callback) {
      // Find local id
      if (req.body.city) {
        var location = req.body.city + ", " + req.body.county + ", " + req.body.state;
        conn.query('SELECT id FROM locals_mod2 WHERE city = ? AND county = ? AND state = ? LIMIT 1', [req.body.city, req.body.county, req.body.state], function(err, data) {
          if (err) {
            callback(err);
          }
          // ! Add check to make sure this returned something ! //
          var localID = data[0].id;
          callback(null, localID);
        });
      } else {
        var location = req.body.county + ", " + req.body.state;
        conn.query('SELECT id FROM locals_mod2 WHERE county = ? AND state = ? LIMIT 1', [req.body.county, req.body.state], function(err, data) {
          if (err) {
            callback(err);
          }
          var localID = data[0].id;
          callback(null, localID);
        });
      }
    },

    function(localID, callback) {
      // Find strat id
      if (req.body.mb) {
        var stratID = req.body.mb;
      } else if (req.body.fm) {
        var stratID = req.body.fm;
      } else if (req.body.gr) {
        var stratID = req.body.gr;
      } else {
        // you messed up error message
      }

      conn.query('SELECT chron_id FROM strat WHERE id = ?', [stratID], function(err, result) {
        if (err) {
          callback(err);
        }
        var chron_id = result[0].chron_id;
        conn.query('SELECT stage, belongs_to FROM chron WHERE id = ?', [chron_id], function(er, data) {
          if (er) {
            callback(er);
          }
          var stage = data[0].stage;
          if (data[0].belongs_to != 0) {
            conn.query('SELECT stage FROM chron WHERE id = ?', [data[0].belongs_to], function(e, data2) {
              if (e) {
                callback(e);
              }
              var containing_stage = data2[0].stage;
              callback(null, localID, stratID, chron_id, stage, containing_stage);
            });
          } else {
            callback(null, localID, stratID, chron_id, stage, '');
          }
          
        });
       
      });
    },

    function(localID, stratID, chron_id, stage, containing_stage, callback) {
      if (req.body.hide_me) {
        var hideMe = 1;
      } else {
        var hideMe = 0;
      }

      var post = {
        orig_name: req.files.photo.name, 
        mb: req.files.photo.size/1000000, 
        title: req.body.title, 
        image_type: req.body.itype, 
        type_specimen: req.body.ttype, 
        cover_pic: 0, 
        ummp: req.body.ummp, 
        local_id: localID, 
        strat_id: stratID, 
        chron_id: chron_id,
        stage: stage,
        containing_stage: containing_stage,
        hide_me: hideMe, 
        login_id: req.session.uid, 
        date: dateString
      };

      conn.query('UPDATE photos SET ? WHERE id = ?', [post, req.body.record], function(err, result) {
        if (err) {
          callback(err);
        } else {
          var picID = req.body.record;
          callback(null, picID);
        }
      });
    },

    // Insert comments
    function(picID, callback) {
      if (req.body.notes) {
        var notePost = {photo_id: picID, notes: req.body.notes};
        conn.query('UPDATE photo_notes SET ? WHERE photo_id = ?', [notePost, picID], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, picID);
          }
        });
      } else {
        var notePost = {photo_id: picID, notes: 'None'};
        conn.query('UPDATE photo_notes SET ? WHERE photo_id = ?', [notePost, picID], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, picID);
          }
        });
      }
    },

    function(picID, callback) {
      for (var i = 1; i < parseInt(req.body.numTaxa) + 1; i++) {
        var t = "t" + i,
            tres = "tres" + i,
            s = "s" + i,
            sres = "sres" + i;

        conn.query('SELECT class AS tclass FROM JJS_genera WHERE genus = ?', [req.body[t]], function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            if (rows.length > 0) {
              var classID = rows[0].tclass;
            } else {
              var classID = 0;
            }

            // Clean up old taxa
            conn.query('DELETE FROM taxa WHERE photo_id = ?', [picID], function(err, rows, fields) {
              if (err) {
                callback(err);
              }
            });

            var taxaPost = {
              photo_id: picID, 
              taxon: req.body[t], 
              taxon_reso: req.body[tres], 
              species: req.body[s], 
              species_reso: req.body[sres], 
              class_id: classID, 
              login_id: req.session.uid
            };

            conn.query('INSERT INTO taxa SET ?', taxaPost, function(err, rows, fields) {
              if (err) {
                callback(err);
              } else {
                console.log("Inserted into taxa");
              }
            });
          }

        });
      }
      callback(null, picID);
    },

    function(picID, callback) {
      if (req.files.photo.size > 0) {
        // Delete old pictures
        fs.unlink(config.imagePath + 'full/' + req.body.record + '.jpg', function(err) {
          if (err) {
            callback(err);
          }
        });
        fs.unlink(config.imagePath + 'main/' + req.body.record + '.jpg', function(err) {
          if (err) {
            callback(err);
          }
        });
        fs.unlink(config.imagePath + 'thumbs/' + req.body.record + '.jpg', function(err) {
          if (err) {
            callback(err);
          }
        });

        // get the temporary location of the file
        var tmp_path = req.files.photo.path;

        // set where the file should actually exists - in this case it is in the "images" directory
        var target_path =  config.imagePath + 'full/' + picID + '.jpg';
        // move the file from the temporary location to the intended location
        fs.rename(tmp_path, target_path, function(err) {
            if (err) {
              callback(err);
            }
            // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
            fs.unlink(tmp_path, function(err) {
              if (err) {
                callback(err);
              }
            });

            // Create medium sized version
            easyimg.resize({src: config.imagePath + 'full/' + picID + '.jpg', dst: config.imagePath + 'main/' + picID + '.jpg', width:450}, function(err, image) {
             if (err) {
                callback(err);
             }
            });

            // Create thumbnail version
            easyimg.resize({src: config.imagePath + 'full/' + picID + '.jpg', dst: config.imagePath + 'thumbs/' + picID + '.jpg', width:60}, function(err, image) {
              if (err) {
                callback(err);
              }

              // If a watermark is requested, add it
              if(req.body.watermark) {
                // Add watermark to full sized version
                easyimg.convert({src: config.imagePath + 'full/' + picID + '.jpg', dst: config.imagePath + 'full/' + picID + '.jpg', label: req.session.full_name, size: '55'}, function(err, image) {
                  if (err) {
                    callback(error);
                  }
                });
                // Add watermark to medium sized version
                easyimg.convert({src: config.imagePath + 'main/' + picID + '.jpg', dst: config.imagePath + 'main/' + picID + '.jpg', label: req.session.full_name, size: '15'}, function(err, image) {
                  if (err) {
                    callback(err);
                  }
                  callback(null, picID);
                });
              } else {
                callback(null, picID);
              }

            });
        });
      } else {
        callback(null, picID);
      }
    }

  ], function(error, picID) {
    if (error) {
      console.log("editRecord - ", error);
      res.redirect("/");
    } else {
      if (typeof req.session.user_id == 'undefined') {
        var login_id = [];
      } else {
        var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
      }
      res.redirect('/viewrecord/' + picID);
    }
  });

} // End editRecord

exports.simpleSearch = function(req, res) {
  async.waterfall([
    function(callback) {
      // Sanitize the input
      for (each in req.body) {
        if (req.body.hasOwnProperty(each)) {

          // Remove leading and trailing whitespace
          req.body[each] = req.body[each].trim();
        }
      }

      if (req.body.query === "") {
        var limit = [{"header": "No records found"}];
        var pages = [];

        res.render('searchResults', {
          limits: limit, pages: pages,
          partials: {
            "head": "head_leaflet",
            "navbar": "navbar",
            "footer": "footer"
          }
        });
      } else {
        var searchTerm = req.body.query;

        // Check if search term is a number or string
        var isnum = /^\d+$/.test(searchTerm);

        // If it's a number, find the photo with that ID, otherwise search photo titles, taxa, species, notes, and comments
        if (isnum === true) {
          var query = "photos.id = " + searchTerm;
          callback(null, query);
        } else if (req.body.searchType === 'Users') {
          var query = "users.name LIKE '%" + searchTerm + "%'";
          callback(null, query);
        } else if (req.body.searchType === 'Strat') {
          var query = "strat.unit LIKE '%" + searchTerm + "%'";
          callback(null, query);
        } else if (req.body.searchType === 'Time') {
          conn.query('SELECT rank, id FROM chron WHERE stage = ?', [searchTerm], function(err, rows, fields) {
            var type = rows[0].rank,
                id = rows[0].id;
            if (type === "stage") {
              var query = "photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and chron_id = " + id + ")";
              callback(null, query);
            } else if (type === "epoch") {
              var query = "photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and (photos.chron_id=" + id + " or photos.chron_id in (SELECT id from chron where chron.belongs_to=" + id + ")))";
              callback(null, query);
            } else if (type === "period") {
              var query = "photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and (photos.chron_id = " + id + " or photos.chron_id in (SELECT id from chron where chron.belongs_to=" + id + " or chron.belongs_to in (SELECT id from chron where belongs_to=" + id + "))))";
              callback(null, query);
            }
          });
        } else {
          var query = "photos.title LIKE '%" + searchTerm + "%' OR taxa.taxon LIKE '%" + searchTerm + "%' OR taxa.species LIKE '%" + searchTerm + "%' OR photos.id in (SELECT photo_id from photo_notes where photo_notes.notes like '%" + searchTerm + "%') OR photos.id in (SELECT photo_id from photo_comments where photo_comments.comments like '%" + searchTerm + "%')";
          callback(null, query);
        }
      }
    },

    // step0
    function(query, callback) {
      // Add the original search criteria to a session cookie for future GET resquests
      req.session.search = req.body;

      // Store the query in a session variable for use by GET routers
      req.session.query = query;

      // Start processing the query
      callback(null, query);
    },

    // step1
    function(query, callback) {
      // Query to find the number of results (mostly checking if greater or less than 20)
      conn.query("SELECT COUNT(DISTINCT photos.id) as count, IF(((SELECT COUNT(*) from photos WHERE " + query + ") > 20), 20, (SELECT COUNT(*) from photos WHERE " + query + ")) as test FROM photos LEFT OUTER JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN strat ON strat.id = photos.strat_id LEFT OUTER JOIN userlog ON userlog.login = photos.login_id LEFT OUTER JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query, function(err, rows, fields) {
        if (err) {
          callback(err);
        }

        // This is true if more than 20 records are found
        if (rows[0].test == 20) {
          var limitb = req.query.page * 20,
              limita = limitb - 20;
          callback(null, limita, limitb, rows, query);

        // If no records are found, stop and send a response indicating so
        } else if (rows[0].test < 1) {
          var limit = [{"header": "No records found"}];
          req.session.hits = rows[0].count;
          var pages = [];
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
          var limitb = rows[0].count,
              limita = 0;
          callback(null, limita, limitb, rows, query);
        }
      });
    },

    //step2 - pagination
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

      callback(null, limit, limita, limitb, pages, query);

    },

    // step3 - Finds the data to populate the page, executes the final search query, and renders the results
    function(limit, limita, limitb, pages, query, callback) {
      conn.query("SELECT COUNT(distinct photos.id) as photos, COUNT(distinct taxa.taxon) as genera, COUNT(distinct case when photos.type_specimen != '' THEN photos.type_specimen END) as type_specimen, locals_mod2.county_fips as fips, (GROUP_CONCAT(DISTINCT ' ',strat.unit)) as strat FROM photos LEFT OUTER JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN userlog ON userlog.login = photos.login_id LEFT OUTER JOIN users ON users.username = userlog.name LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id LEFT OUTER JOIN strat ON strat.id = photos.strat_id WHERE " + query + " GROUP BY locals_mod2.county_fips", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var mapdata = rows;
        callback(null, query, limita, limit, pages, mapdata);
        
      });
    },

    function(query, limita, limit, pages, mapdata, callback) {
      conn.query("SELECT DISTINCT photos.id, photos.title, photos.ummp, photos.type_specimen, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) from taxa WHERE taxa.photo_id = photos.id) as taxa FROM photos LEFT OUTER JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN strat ON strat.id = photos.strat_id LEFT OUTER JOIN userlog ON userlog.login = photos.login_id LEFT OUTER JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query + " LIMIT " + limita + ",20", function(err, rows, fields) {
        if (err) {
          callback(err);
        }
        var result = rows;
        callback(null, result, limit, pages, mapdata);

      });
    }

  ], function(error, result, limit, pages, mapdata) {

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
  });
}

// Router for all queries from the search box
exports.searchPost = function(req, res) {
    async.waterfall([
      // Build the query - via Shanan's PHP code
      function(callback) {
        // Sanitize the input
        for (each in req.body) {
          if (req.body.hasOwnProperty(each)) {
            // Remove leading and trailing whitespace
            req.body[each] = req.body[each].trim();
          }
        }

        // Add the original search criteria to a session cookie for future GET resquests
        req.session.search = req.body;

        // Code below is a javascript translation of showarchive.php and handles processing of the search form
        var query,
            where;

        if (req.body.pid) {
            query = "photos.id=" + req.body.pid;
            // If the photo id is known, go to the page
            res.redirect('/viewrecord/' + req.body.pid);
        } else {

          if (req.body.title) {
            where = "photos.title like '%" + req.body.title + "%'";
          }

          if (req.body.itype) {
            if (typeof where !== 'undefined') {
              where += " and image_type='" + req.body.itype + "'";
            } else {
              where = "image_type='" + req.body.itype + "'";
            }
          }

          if (req.body.ttype) {
            if (typeof where !== 'undefined') {
              where += " and type_specimen='" + req.body.ttype + "'";
            } else {
              where = "type_specimen='" + req.body.ttype + "'";
            }
          }

          if (req.body.alltype == 1) {
            if (typeof where !== 'undefined') {
              where += " and type_specimen not like ''";
            } else {
              where = "type_specimen not like ''";
            }
          }

          if (req.body.ummp) {
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

          if (req.body.mb) {
            where = "strat_id=" + req.body.mb;
          } else if (req.body.fm) {
            where = "(strat_id=" + req.body.fm + " or strat_id in (SELECT id from strat where belongs_to=" + req.body.fm + "))";
          } else if (req.body.gr) {
            where = "(strat_id=" + req.body.gr + " or strat_id in (SELECT id from strat where belongs_to=" + req.body.gr + " or belongs_to in (SELECT id from strat where belongs_to=" + req.body.gr + ")))";
          }

          if (typeof where !== 'undefined') {
            if (typeof query !== 'undefined') {
              query += " and photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and " + where + ")";
            } else {
              query = "photos.id in (SELECT photos.id from photos,strat where photos.strat_id=strat.id and " + where + ")";
            }
          }

          where = undefined;

          if (req.body.comments) {
            where = "photo_comments.comments like '%" + req.body.comments + "%'";
            if (typeof query !== 'undefined') {
              query += " and photos.id in (SELECT photo_id from photo_comments where " + where + ")";
            } else {
              query = "photos.id in (SELECT photo_id from photo_comments where " + where + ")";
            }
          }

          where = undefined;

          if (req.body.comm_contrib) {
            where = "users.name='" + req.body.comm_contrib + "'";
            if (typeof query !== 'undefined') {
              query += " and photos.id in (SELECT photo_id from photo_comments,userlog,users where photo_comments.login_id=userlog.login and userlog.name=users.username and " + where + ")";
            } else {
              query = "photos.id in (SELECT photo_id from photo_comments,userlog,users where photo_comments.login_id=userlog.login and userlog.name=users.username and " + where + ")";
            }
          }

          where = undefined;

          if (req.body.notes) {
            where = "photo_notes.notes like '%" + req.body.notes + "%'";
            if (typeof query !== 'undefined') {
              query += " and photos.id in (SELECT photo_id from photo_notes where " + where + ")";
            } else {
              query = "photos.id in (SELECT photo_id from photo_notes where " + where + ")";
            }
          }

          where = undefined;

          if (req.body.contrib) {
            where = "users.name='" + req.body.contrib + "'";
            if (typeof query !== 'undefined') {
              query += " and photos.id in (SELECT photos.id from photos,userlog,users where photos.login_id=userlog.login and userlog.name=users.username and hide_me=0 and " + where + ")";
            } else {
              query = "photos.id in (SELECT photos.id from photos,userlog,users where photos.login_id=userlog.login and userlog.name=users.username and hide_me=0 and " + where + ")";
            }
          }

          where = undefined;

          if (req.body.st) {
            where = "photos.chron_id=" + req.body.st;
          } else if (req.body.ep) {
            where = "(photos.chron_id=" + req.body.ep + " or photos.chron_id in (SELECT id from chron where chron.belongs_to=" + req.body.ep + "))";
          } else if (req.body.pr) {
            where = "(photos.chron_id=" + req.body.pr + " or photos.chron_id in (SELECT id from chron where chron.belongs_to=" + req.body.pr + " or chron.belongs_to in (SELECT id from chron where belongs_to=" + req.body.pr + ")))";
          }

          if (typeof where !== 'undefined') {
            if (typeof query !== 'undefined') {
              query += " and photos.id in (SELECT photos.id from photos,strat,chron where photos.strat_id=strat.id and strat.chron_id=chron.id and " + where + ")";
            } else {
              query = "photos.id in (SELECT photos.id from photos,strat,chron where photos.strat_id=strat.id and strat.chron_id=chron.id and " + where + ")";
            }
          }

          where = undefined;

          if (req.body.city) {
            where = "locals.city='" + req.body.city + "'";
          }

          if (req.body.county) {
            if (typeof where !== 'undefined') {
              where += " and locals.county='" + req.body.county + "'";
            } else {
              where = "locals.county='" + req.body.county + "'";
            }
          }

          if (req.body.state) {
            if (typeof where !== 'undefined') {
              where += " and locals.state='" + req.body.state + "'";
            } else {
              where = "locals.state='" + req.body.state + "'";
            }
          }

          if (req.body.t1) {
            if (typeof where !== 'undefined'){
              where += " and taxa.taxon LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_phylum LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_class LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_order LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_family LIKE '%" + req.body.t1 + "%'";
            } else {
              where = "taxa.taxon LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_phylum LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_class LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_order LIKE '%" + req.body.t1 + "%' OR taxa.pbdb_family LIKE '%" + req.body.t1 + "%'";
            }
          }

          if (req.body.s1) {
            if (typeof where !== 'undefined'){
              where += " and taxa.species LIKE '%" + req.body.s1 + "%'";
            } else {
              where = "taxa.species LIKE '%" + req.body.s1 + "%'";
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

          //console.log("POST: ", query);

          if (typeof query === undefined) {
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
            // Start processing the query
            callback(null, null, query);
          }
        }
      },

      function(skip, query, callback) {
        // Query to find the number of results (mostly checking if greater or less than 20)
        conn.query("SELECT COUNT(DISTINCT photos.id) as count, IF(((SELECT COUNT(*) from photos WHERE " + query + ") > 20), 20, (SELECT COUNT(*) from photos WHERE " + query + ")) as test FROM photos LEFT OUTER JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN strat ON strat.id = photos.strat_id LEFT OUTER JOIN userlog ON userlog.login = photos.login_id LEFT OUTER JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query, function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            var records = rows || [{"test": 0, "count": 0}];

            // This is true if more than 20 records are found
            if (records[0].county > 0 && records[0].test === 20) {
              var limitb = 20,
                  limita = limitb - 20;

              callback(null, null, limita, limitb, records);

            // If no records are found, stop and send a response indicating so
            } else if (records[0].test < 1) {
              var limit = [{"header": "No records found"}],
                  pages = [];
              req.session.hits = records[0].count;
              
              if (typeof req.session.user_id === 'undefined') {
                var login_id = [];
              } else {
                var login_id = [{"username": req.session.user_id, "full_name": req.session.full_name}];
              }
              res.render('searchResults', {
                login: login_id, 
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
              // error, skip, query, limita, limitb, records
              callback(null, null, query, limita, limitb, records);
            }
          }
            
        });
        
      },

      function(skip, query, limita, limitb, records, callback) {

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

        callback(null, null, query, limit, limita, limitb, pages);

      },

      function(skip, query, limit, limita, limitb, pages, callback) {
        conn.query("SELECT COUNT(distinct photos.id) as photos, COUNT(distinct taxa.taxon) as genera, COUNT(distinct case when photos.type_specimen != '' THEN photos.type_specimen END) as type_specimen, locals_mod2.county_fips as fips, (GROUP_CONCAT(DISTINCT ' ',strat.unit)) as strat FROM photos LEFT OUTER JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id LEFT OUTER JOIN strat ON strat.id = photos.strat_id WHERE " + query + " GROUP BY locals_mod2.county_fips", function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            var mapdata = rows;
            callback(null, query, limit, limita, limitb, pages, mapdata);
          }
        });
      },

      function(query, limit, limita, limitb, pages, mapdata, callback) {
        conn.query("SELECT DISTINCT photos.id, photos.title, photos.ummp, photos.type_specimen, DATE_FORMAT( photos.DATE,  '%Y-%m-%d' ) AS date, locals_mod2.city, locals_mod2.county, locals_mod2.state, strat.unit, LOWER(strat.rank) as rank, users.name, photo_notes.notes, (SELECT GROUP_CONCAT(' ', taxon, ' ', species) from taxa WHERE taxa.photo_id = photos.id) as taxa FROM photos LEFT OUTER JOIN locals_mod2 ON locals_mod2.id = photos.local_id LEFT OUTER JOIN strat ON strat.id = photos.strat_id LEFT OUTER JOIN userlog ON userlog.login = photos.login_id LEFT OUTER JOIN users ON users.username = userlog.name LEFT OUTER JOIN photo_notes ON photo_notes.photo_id = photos.id LEFT OUTER JOIN taxa ON taxa.photo_id = photos.id WHERE " + query + " LIMIT " + limita + ",20", function(err, rows, fields) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows, limit, pages, mapdata);
          }
          
        });
      }

    ], function(error, result, limit, pages, mapdata) {

      if (error) {
        console.log("searchPost - ", error);
        res.redirect("/");
      } else {
        if (typeof req.session.user_id === 'undefined') {
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
}; // End searchPost
