$(document).ready(function() {

  // Attach listeners for the interface
  $('a.accordion-toggle').on('click', function() {
    if($(this).children(i).hasClass('icon-plus')) {
      $(this).children(i).removeClass('icon-plus').addClass('icon-minus');
    } else {
      $(this).children(i).removeClass('icon-minus').addClass('icon-plus')
    }
  });
  $('.carousel').carousel({
    interval: 2000000000
  });

  // Activate the tabs in the modal
  $('#tabs').tab();

  // Link the pictures to their pages
  $('.types').click(function(){
    var theID = $(this).attr("id");
    window.location.href = "/viewrecord/" + theID;
  });

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

  // Load 16 random pictures on page load
  $.ajax({
      type:'GET',
      url:'/api/photos/random/' + 16,
      success: function(data) {
        var photos = data;
        //console.log(photos)
      },
      dataType: 'jsonp',
      async: false
    });

  // Grab 16 random pictures when "Load More" is clicked
  $('#loadMore').click(function(){
    $.ajax({
      type:'GET',
      url:'/api/photos/random/' + 16,
      success: function(data) {
        var photos = data;
        //console.log(photos)
        for (var i = 0; i < photos.length; i++) {
          $('#grid').append('<div class="span3 types resize" id="' + photos[i].id + '" style="background-image:url(/images/main/' + photos[i].id + '.jpg);"></div>');
        };
        resizePics();
        $('.types').click(function(){
          var theID = $(this).attr("id");
          window.location.href = "/viewrecord/" + theID;
        });
      },
      dataType: 'jsonp',
      async: false
    });
  });

  function resize() {
    if ($('body').width() < 768) {
      $('#header_logo').hide();
      $('.nav-collapse.collapse.nav-pills.pull-right.nav-tabs-fixed').css('top', '157px').css('width','100%').css('background-color', 'rgb(255,255,255)');
    } else {
      $('#header_logo').show();
      $('.nav-collapse.collapse.nav-pills.pull-right.nav-tabs-fixed').css('width','auto').css('background-color', 'inherit').css('top', 0);
    }
  }

  function resizePics() {
    var htmlWidth = $('html').width();

    if (htmlWidth < 768) {
      picWidth = htmlWidth/4 - 11;
    } else {
      picWidth = htmlWidth/4 - 1;
    }

    $('.resize').css('width', picWidth + 'px');
  }

  // Adjust layout on window resize
  $(window).resize(function(){
    resize();
    resizePics();
  });

  resize();
  resizePics();

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

  var burwell = new L.TileLayer('https://macrostrat.org/api/v2/maps/burwell/{z}/{x}/{y}/tile.png', {
    opacity: 0.8
  }).addTo(map);

  legend.onAdd = function(map) {
      var div = L.DomUtil.create('div', 'info legend'),
        colors = ['#252525','#636363','#969696','#bdbdbd','#d9d9d9','#f7f7f7'],
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
  $.getJSON('/js/for_stats.json', function (data) {
    var input_geojson = topojson.object(data, data.objects.for_stats);

    var photos = getMapData(),
        counties = {"type": "FeatureCollection", features: []};

    // Loop through all the features, attach DB data, and assemble a valid GeoJSON
    for (i=0; i < input_geojson.geometries.length; i++) {
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
    return d > 300  ? '#252525' :
           d > 100  ? '#636363' :
           d > 50   ? '#969696' :
           d > 10   ? '#bdbdbd' :
           d > 0    ? '#d9d9d9' :
                       '#f7f7f7';
  }

  function getOpacity(d) {
    return d > 0 ? 0.85 : 0.45
  }

  function style(feature) {
    return {
        fillColor: getColor(feature.properties.photos),
        weight: 0.1,
        opacity: 0.5,
        color: '#222',
        fillOpacity: getOpacity(feature.properties.photos)
    };
  }
});
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
      url:'/api/photos/county/' + currentCounty.feature.properties.FIPS + '?home=true&limit=0',
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
          $('#thumbGrid').html(thumbnailHTML);
          $('#myCarousel').html(html);

          // Open up the lightbox/modal
          $('#thumbnailLightbox').modal();

          // Default to grid view
          $('a[href=#thumbGrid]').tab('show');

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
    url:'/api/photos/county/' + currentCounty.feature.properties.FIPS + '?home=true&limit=' + limit,
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
        $('#thumbGrid').html(thumbnailHTML);
        $('#myCarousel').html(html);

        // Open up the lightbox/modal
        $('#thumbnailLightbox').modal();

        // Default to grid view
        $('a[href=#thumbGrid]').tab('show');

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
/*
function rebind() {
  console.log("rebound");
  $('.tt-suggestion').on('click select', function() {
    var parent = $(this).parent().parent().attr('class');
    parent = parent.replace(/tt-dataset-/g, '');
    console.log(typeof parent);
    $('#searchType').val(parent);
    console.log(parent);
  });
}
*/
