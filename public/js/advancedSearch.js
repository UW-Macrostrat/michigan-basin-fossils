$('#addATaxon').on('click', function() {
  addTaxon();
});

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

$("#appendedInputButton").catcomplete({
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
    //$('input.typeahead').val('');
  }
});

var rows = 2;

function addTaxon() {
  $("#searchTable tr.taxon:last").after("<tr id='taxon" + rows + "'' class='taxon'><th>Taxon " + rows + ":  <a class='btn taxonRemove'>Remove</a><br></th><td><input placeholder='Phyla, class, or order' type='text' size='22' name='t" + rows + "'> <select class='small' name='tres" + rows + "'><option value=''></option><option value='aff.'>aff.</option><option value='cf.'>cf.</option><option value='exgr.'>exgr.</option><option value='n.gen.'>n.gen.</option><option value='sensulato'>sensulato</option><option value='?'>?</option><option value=''>&quot;</option><option value='informal'>informal</option><option value='informalaff.'>informalaff.</option><option value='informalcf.'>informalcf.</option></select> <input placeholder='species' type='text'size='20'name='s" + rows + "'> <select class='small' name='sres" + rows + "'><option value=''selected></option> <option value='aff.'>aff.</option><option value='cf.'>cf.</option><option value='exgr.'>exgr.</option><option value='n.gen.'>n.gen.</option><option value='sensulato'>sensulato</option><option value='?'>?</option><option value=''>&quot;</option><option value='informal'>informal</option><option value='informalaff.'>informalaff.</option><option value='informalcf.'>informalcf.</option></select></td></tr>");
  rows++;
  $('.taxonRemove').on('click', function() {
    var id = $(this).closest("tr").attr("id");
    $('#' + id).remove();
  });
}

$('.taxonRemove').on('click', function() {
  var id = $(this).closest("tr").attr("id");
  $('#' + id).remove();
});

$("#stateSelector").change(function() {
  var selectedState = $("#stateSelector").val();
  $('#countySelector').children().remove().end();
  $("#countySelector").append("<option value='' selected>&nbsp;</option>");
  $.ajax({
    type:'GET',
    url:'/api/getCounties?state=' + selectedState, 
    success: function(data) {
      var counties = data;

      for(var i=0;i<counties.length;i++) {
        $("#countySelector").append("<option value='" + counties[i].county + "''>" + counties[i].county + "</option>");
      }
    }, 
    dataType: 'jsonp', 
    async: false 
  });
});

// Initialize the city autocompelte
cityAutocomplete = $('#city').typeahead();

$("#countySelector").change(function() {
  var selectedState = $("#stateSelector").val(),
      selectedCounty = $("#countySelector").val();

  $.ajax({
    type:'GET',
    url:'/api/getCities?state=' + selectedState + '&county=' + selectedCounty, 
    success: function(data) {
      var cities = data,
          cityList = [];

      for(var i=0;i<cities.length;i++) {
        if (cities[i].city != null) {
          cityList.push(cities[i].city);
        }
      }
      cityAutocomplete.data('typeahead').source = cityList;
    }, 
    dataType: 'jsonp', 
    async: false 
  });
});