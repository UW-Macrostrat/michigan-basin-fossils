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