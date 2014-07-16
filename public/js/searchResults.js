function init() {
  // Attach listeners for the interface

  $('a.accordion-toggle').on('click', function() {
    if($(this).children(i).hasClass('icon-plus')) {
      $(this).children(i).removeClass('icon-plus').addClass('icon-minus');
    } else {
      $(this).children(i).removeClass('icon-minus').addClass('icon-plus')
    }
  });
  $('.thumb').on('click', function() {
    $('.item').removeClass('active');
    var theID = $(this).attr("id");
    $('#' + theID + '.item').addClass('active');
  });

  // Link the thumbnails to their larger versions and switch tabs
  $('.tmb').on('click', function() { 
    var theID = $(this).attr("id");
    $('.item').removeClass('active');
    $('#' + theID + '.item').addClass('active');
    $('a[href=#slidesCurrent]').tab('show');
  });

  $('.carousel').carousel({
    interval: 2000000000
  });

  // Activate the tabs in the modal
  $('#tabs').tab();
  $('#tabCurrent').tab();

  $.widget( "custom.catcomplete", $.ui.autocomplete, {
    _renderMenu: function( ul, items ) {
      var that = this,
        currentCategory = "";
      $.each( items, function( index, item ) {
        if ( item.category != currentCategory ) {
          ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
          currentCategory = item.category;
        }
        that._renderItemData( ul, item );
      });
    }
  });

  $("input.typeahead").catcomplete({
    source: function(request, response) {
      $.ajax({
        url: "/api/autocomplete",
        dataType: "jsonp",
        data: {
          q: request.term
        },
        success: function( data ) {
          response( $.map( data, function( item ) {
            return {
              label: item.label,
              value: item.label,
              category: item.category
            }
          }));
        }
      });
    },
    minLength: 2,
    select: function( event, ui ) {
      console.log( ui.item ? "Selected: " + ui.item.label : "Nothing selected, input was " + this.value);
      $('#searchType').val(ui.item.category);
      setTimeout(function() {
        checkSearch();
      }, 500);
    },
    open: function() {
      $('.ui-menu').css('z-index', 99999);
    },
    close: function() {
     // $('input.typeahead').val('');
    }
  });


  function fillTemplate(item) {
    var result = {"pbData": pbData};

    template = "{{#pbData}}<h4><a href='http://paleobiodb.org/cgi-bin/bridge.pl?action=checkTaxonInfo&taxon_name={{nam}}'>{{nam}}</a></h4><p>{{#att}}<strong>Named: </strong>{{att}}<br>{{/att}}{{^att}}{{/att}}{{#fea}}<strong>First appearance: </strong>{{fea}} ({{fla}})<br>{{/fea}}{{^fea}}{{/fea}}{{#lea}}<strong>Last appearance: </strong>{{lea}} ({{lla}})<br>{{/lea}}{{^lea}}{{/lea}}{{#sta}}<strong>Taxonomic status: </strong>{{sta}}<br>{{/sta}}{{^sta}}{{/sta}}{{#ext}}<strong>ext: </strong>{{ext}}<br><br>{{/ext}}{{^ext}}{{/ext}}{{#clt}}<strong>Class: </strong><a href='#' class='pbdb_link'>{{clt.nam}}</a><br>{{/clt}}{{^clt}}{{/clt}}{{#odt}}<strong>Order: </strong><a href='#' class='pbdb_link'>{{odt.nam}}</a><br>{{/odt}}{{^odt}}{{/odt}}{{#fmt}}<strong>Family: </strong><a href='#' class='pbdb_link'>{{fmt.nam}}</a><br>{{/fmt}}{{^fmt}}{{/fmt}}</p>{{/pbData}}{{^pbData}}<p>PaleoDB data unavailable</p>{{/pbData}}";

    templateHTML = Mustache.to_html(template, result);

    $(item).html(templateHTML);
    bindLink();
}
  
  $('.deepblueInfo').on('click', function() {
    var currentID = $(this).attr("href"),
      currentID_strip = currentID.replace('#deepblueInfo', '');

    if ($(currentID).text().length < 26) {
      $.ajax({
        type:'GET',
        url:'/api/photoTaxa/?photo_id=' + currentID_strip, 
        success: function(data) {
          if (data.length > 0) {
            var result = data;
            for (var i=0;i<result.length;i++) {
              $(currentID).append('<p><a href="http://deepblue.lib.umich.edu/simple-search?query=' + result[i].taxon + '">Deep Blue - ' + result[i].taxon + '</a></p>');
            }
          }
        },
        dataType: 'jsonp', 
        async: false 
      });
    }
  });

  $('.pbdbInfo').on('click', function() {
    var currentID = $(this).attr("href"),
      currentID_strip = currentID.replace('#pbdbInfo', '');

    if ($(currentID).text().length < 26) {
      $.ajax({
        type:'GET',
        url:'/api/photoTaxa/?photo_id=' + currentID_strip, 
        success: function(data) {
          if (data.length > 0) {
            var result = data;
            var taxa = [];
            for (var i=0;i<result.length;i++) {
              taxa.push(result[i].taxon);
            }

            pbData = [];

            for (var p=0;p<taxa.length;p++) {
              $.ajax({
                type:'GET',
                url:'http://paleobiodb.org/data1.1/taxa/single.json?name=' + taxa[p] + '&show=attr,nav',
                dataType: 'json',
                crossDomain: true, 
                success: function(pbdata) {
                  pbData.push(pbdata.records[0]);
                },
                error: function(xhr, ajaxOptions, thrownError) {
                  //console.log(xhr.status);
                  //console.log(thrownError);
                },
                async: false
              });
            }
            fillTemplate(currentID);
          }
        },
        dataType: 'jsonp', 
        async: false 
      });
    }
  });

  // Initialize the map
  var map = new L.Map('map', {
    center: new L.LatLng(44.17, -84.847),
    zoom: 6,
    maxZoom:10,
    minZoom: 5,
    zoomControl: false
  }),

    osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'}).addTo(map),
    zoom = new L.Control.Zoom({position: 'bottomright'}).addTo(map),
    legend = L.control({position: 'bottomleft'});
    
  legend.onAdd = function(map) {
      var div = L.DomUtil.create('div', 'info legend'),
        colors = ['#377C5A','#47966A','#57B07B','#69CB8B','#7CE79B','#bbb'],
        breaks = ['Greater than 300', '101-300', '51-100', '11-50', '1-10', 'None'];

      div.innerHTML += 'Number of Photos<br>';
      for(i=0;i<6;i++) {
        div.innerHTML += '<i class="legendRamp" style="background-color: ' + colors[i] + '"></i>' + breaks[i] + '<br>';
      }

      return div;
  };

  legend.addTo(map);

  var infoWindow = L.control({position: 'bottomleft'});

  infoWindow.onAdd = function(map) {
      var div = L.DomUtil.create('div', 'info legend id');
      //div.innerHTML += '<div id="identifier"></div>';
      return div;
  };

  infoWindow.addTo(map);
  $('.info.legend.id').hide();

  // Load the county boundaries as a topojson, then grab the data from the DB
  $.getJSON('/js/features_on.json', function (data) {
    var input_geojson = topojson.object(data, data.objects.features);

    var photos = getMapData(),
        counties = {"type": "FeatureCollection", features: []};

    // Loop through all the features, attach DB data, and assemble a valid GeoJSON
    for (var i=0; i < input_geojson.geometries.length; i++) {
      for (j=0; j < photos.length; j++) {

        // A little hack to handle sloppiness...
        if(photos[j].fips.length < 5) {
          photos[j].fips = "0" + photos[j].fips;
        }

        if (photos[j].fips == input_geojson.geometries[i].properties.FIPS) {
          input_geojson.geometries[i].properties.photos = photos[j].photos;
          input_geojson.geometries[i].properties.genera = photos[j].genera;
          input_geojson.geometries[i].properties.type_specimen = photos[j].type_specimen;
          input_geojson.geometries[i].properties.strat = photos[j].strat;
          input_geojson.geometries[i].properties.pages = Math.ceil(photos[j].photos / 20);
        } 

      }
      if (typeof input_geojson.geometries[i].properties.photos === 'undefined') {
        input_geojson.geometries[i].properties.photos = "0";
      }
      var geometry = {"type": input_geojson.geometries[i].type, "coordinates": input_geojson.geometries[i].coordinates},
          object = {"properties":input_geojson.geometries[i].properties, "geometry":geometry, "type":"Feature"};
      counties.features.push(object);
    };

    county_layer = L.geoJson(counties, {
      style: style,
      onEachFeature: function(feature, layer) {
        layer.on({
          mouseover: mouseover,
          mouseout: mouseout,
          click: fetchCountyPhotos
        });
      }
    }).addTo(map);

  });  // End getJSON for load features callback

  function getColor(d) {
    return d > 300  ? '#377C5A' :
           d > 100  ? '#47966A' :
           d > 50   ? '#57B07B' :
           d > 10   ? '#69CB8B' :
           d > 0    ? '#7CE79B' :
                       '#bbb';
  }

  function style(feature) {
    return {
        fillColor: getColor(feature.properties.photos),
        weight: 0.1,
        opacity: 1,
        color: '#222',
        fillOpacity: 0.7
    };
  }
}
  function mouseover(e) {
    e.target.setStyle({
      weight: 2,
      color: '#000'
    });
    if (e.target.feature.properties.genera) {
      $('.info.legend.id').html('<p><strong>County/Province:</strong> ' + e.target.feature.properties.NAME + '<br><strong>Photos:</strong> ' + e.target.feature.properties.photos + '<br><strong>Genera:</strong> ' + e.target.feature.properties.genera + '<br><strong>Type Specimen:</strong> ' + e.target.feature.properties.type_specimen + '<br><strong>Strat units:</strong> ' + e.target.feature.properties.strat + '</p>').show();
    }
  }

  function mouseout(e) {
    county_layer.resetStyle(e.target);
    $('.info.legend.id').hide().html('');
  }

  function fetchCountyPhotos(e) {
    limit = 0;
    currentPage = 1;
    currentCounty = e.target; 

    $.ajax({
      type:'GET',
      url:'/api/photos/county/' + e.target.feature.properties.FIPS + '?limit=0',  
      success: function(data) {
        if (data.length > 0) {
          var result = {"pictures" : data},

          // HTML template for the slides
            template = "<div class='carousel-inner'>{{#pictures}}<div class='item' id='{{id}}'><a href='/viewrecord/{{id}}'><img src='/images/main/{{id}}.jpg'></a><div class='carousel-caption'><h4 class='slideTitle'>{{taxon}}</h4><p>{{name}}</p></div></div>{{/pictures}} </div><a class='carousel-control left' href='#myCarousel' data-slide='prev'>&lsaquo;</a><a class='carousel-control right' href='#myCarousel' data-slide='next'>&rsaquo;</a>",

          // HTML template for the grid
              thumbnailTemplate = '<div class="row-fluid"><div class="span12">{{#pictures}}<div class="span3 ratio tmb" id="{{id}}" style="background-image:url(\'/images/thumbs/{{id}}.jpg\')"></div>{{/pictures}}</div></div>',

          // Fill in the templates with the data
              thumbnailHTML = Mustache.to_html(thumbnailTemplate, result),
              html = Mustache.to_html(template, result);

          // Replace the HTML in the DOM with the newly populated templates
          $('#grid').html(thumbnailHTML);
          $('#myCarousel').html(html);

          // Open up the lightbox/modal
          $('#thumbnailLightbox').modal();

          // Default to grid view
          $('a[href=#grid]').tab('show');

          // Link the thumbnails to their larger versions and switch tabs
          $('.tmb').on('click', function() { 
            var theID = $(this).attr("id");
            $('.item').removeClass('active');
            $('#' + theID + '.item').addClass('active');
            $('a[href=#slides]').tab('show');
          });

          // Make sure at least 1 item in the carousel is 'active' - otherwise doesn't display
          $('.carousel-inner .item:first').addClass('active')

          if (currentCounty.feature.properties.photos > 20) {
            $('#rightArrow').show();
            $('#modalPagination').show();
            $('#currentPage').html('1');
            $('#totalPages').html(currentCounty.feature.properties.pages);
          } else {
            $('#rightArrow').hide();
            $('#leftArrow').hide();
            $('#modalPagination').hide();
          }
          if (data.length == 1) {
            $('.left.carousel-control').hide();
            $('.right.carousel-control').hide();
          } else {
            $('#myCarousel').on('slid', '', function() {
              var $this = $(this);
              $this.children('.carousel-control').show();

              if($('.carousel-inner .item:first').hasClass('active')) {
                $this.children('.left.carousel-control').hide();
              } else if($('.carousel-inner .item:last').hasClass('active')) {
                $this.children('.right.carousel-control').hide();
              }

            });
          }
        } // End if
      }, 
      dataType: 'jsonp', 
      async: false 
    });
  }

function morePictures(e, direction) {
  if (direction == 1) {
    $('#leftArrow').show();
    currentPage += 1;
    limit = limit + 20;
    if (currentPage >= currentCounty.feature.properties.pages) {
      $('#rightArrow').hide();
      currentPage = currentCounty.feature.properties.pages;
    } else {
      $('#leftArrow').show();
      $('#rightArrow').show();
    }
  } else {
    currentPage -= 1;
    limit = limit - 20;
    if (limit <= 0) {
      currentPage = 1;
      $('#leftArrow').hide();
      limit = 0;
    } else {
      $('#leftArrow').show();
      $('#rightArrow').show();
    }
  }
  $('#currentPage').html(currentPage);

    $.ajax({
      type:'GET',
      url:'/api/photos/county/' + currentCounty.feature.properties.FIPS + '?limit=' + limit, 
      success: function(data) {
        if (data.length > 0) {
          var result = {"pictures" : data},

          // HTML template for the slides
            template = "<div class='carousel-inner'>{{#pictures}}<div class='item' id='{{id}}'><a href='/viewrecord/{{id}}'><img src='/images/main/{{id}}.jpg'></a><div class='carousel-caption'><h4 class='slideTitle'>{{taxon}}</h4><p>{{name}}</p></div></div>{{/pictures}} </div><a class='carousel-control left' href='#myCarousel' data-slide='prev'>&lsaquo;</a><a class='carousel-control right' href='#myCarousel' data-slide='next'>&rsaquo;</a>",

          // HTML template for the grid
              thumbnailTemplate = '<div class="row-fluid"><div class="span12">{{#pictures}}<div class="span3 ratio tmb" id="{{id}}" style="background-image:url(\'/images/thumbs/{{id}}.jpg\')"></div>{{/pictures}}</div></div>',

          // Fill in the templates with the data
              thumbnailHTML = Mustache.to_html(thumbnailTemplate, result),
              html = Mustache.to_html(template, result);

          // Replace the HTML in the DOM with the newly populated templates
          $('#grid').html(thumbnailHTML);
          $('#myCarousel').html(html);

          // Open up the lightbox/modal
          $('#thumbnailLightbox').modal();

          // Default to grid view
          $('a[href=#grid]').tab('show');

          // Link the thumbnails to their larger versions and switch tabs
          $('.tmb').on('click', function() { 
            var theID = $(this).attr("id");
            $('.item').removeClass('active');
            $('#' + theID + '.item').addClass('active');
            $('a[href=#slides]').tab('show');
          });

          // Make sure at least 1 item in the carousel is 'active' - otherwise doesn't display
          $('.carousel-inner .item:first').addClass('active')

          if (currentCounty.feature.properties.photos > 20) {
            $('.modal-header.county').html('<p>Showing 20 of ' + currentCounty.feature.properties.photos + ' pictures</p><a href="javascript:morePictures(0)">Previous 20</a>      <a href="javascript:morePictures(1)">Next 20</a>');
          } 
          if (data.length == 1) {
            $('.left.carousel-control').hide();
            $('.right.carousel-control').hide();
          } else {
            $('#myCarousel').on('slid', '', function() {
              var $this = $(this);
              $this.children('.carousel-control').show();

              if($('.carousel-inner .item:first').hasClass('active')) {
                $this.children('.left.carousel-control').hide();
              } else if($('.carousel-inner .item:last').hasClass('active')) {
                $this.children('.right.carousel-control').hide();
              }

            });
          }
        } // End if
      }, 
      dataType: 'jsonp', 
      async: false 
    });
}

function checkSearch() {
  var searchVal = $('[name=query]').val();

  // Remove leading and trailing whitespace
  searchVal = searchVal.trim();

  // Remove all non alphanumeric characters
  searchVal = searchVal.replace(/\W/g, '');

  // Remove all numbers
  searchVal = searchVal.replace(/[0-9]/g, '');

  if (searchVal.length < 1) {
    $('.control-group#simpleSearch').addClass('error');
    $('#queryHelp').html("Please enter a valid search term").css('display', 'block');
    $('[name=query]').val("");
    return false;
  } else {
    document.getElementById("searchForm").submit();
    return true;
  }
}

function bindLink() {
  $('.pbdb_link').off('click');
  $('.pbdb_link').click(function(event) {
    event.preventDefault();
    console.log(event.target.innerHTML);
    $.post("http://localhost:8080/search", { t1: event.target.innerHTML })
      .done(function(res) {
        window.location = "/search?page=1";
      });
  });
}

var rankMap = { 25: "unranked", 23: "kingdom", 22: "subkingdom",
      21: "superphylum", 20: "phylum", 19: "subphylum",
      18: "superclass", 17: "class", 16: "subclass", 15: "infraclass",
      14: "superorder", 13: "order", 12: "suborder", 11: "infraorder",
      10: "superfamily", 9: "family", 8: "subfamily",
      7: "tribe", 6: "subtribe", 5: "genus", 4: "subgenus",
      3: "species", 2: "subspecies" };