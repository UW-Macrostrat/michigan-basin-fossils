$(document).ready(function() {
    var currentID = $('h2').attr('id');

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
    //  $('input.typeahead').val('');
    }
  });

    $.ajax({
      type:'GET',
      url:'/api/photoTaxa/?photo_id=' + currentID, 
      success: function(data) {
        if (data.length > 0) {
          var result = data;
          var taxa = [];
          for (var i=0;i<result.length;i++) {
            taxa.push(result[i].taxon);
            $("#fromDeepBlue").append('<p><a href="http://deepblue.lib.umich.edu/simple-search?query=' + result[i].taxon + '">' + result[i].taxon + '</a></p>');
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
  });

  function fillTemplate(item) {
    var result = {"pbData": pbData},

    template = "{{#pbData}}<h4><a href='http://paleobiodb.org/cgi-bin/bridge.pl?action=checkTaxonInfo&taxon_name={{nam}}'>{{nam}}</a></h4><p>{{#att}}<strong>Named: </strong>{{att}}<br>{{/att}}{{^att}}{{/att}}{{#fea}}<strong>First appearance: </strong>{{fea}} ({{fla}})<br>{{/fea}}{{^fea}}{{/fea}}{{#lea}}<strong>Last appearance: </strong>{{lea}} ({{lla}})<br>{{/lea}}{{^lea}}{{/lea}}{{#sta}}<strong>Taxonomic status: </strong>{{sta}}<br>{{/sta}}{{^sta}}{{/sta}}{{#ext}}<strong>ext: </strong>{{ext}}<br><br>{{/ext}}{{^ext}}{{/ext}}{{#clt}}<strong>Class: </strong><a href='#' class='pbdb_link'>{{clt.nam}}</a><br>{{/clt}}{{^clt}}{{/clt}}{{#odt}}<strong>Order: </strong><a href='#' class='pbdb_link'>{{odt.nam}}</a><br>{{/odt}}{{^odt}}{{/odt}}{{#fmt}}<strong>Family: </strong><a href='#' class='pbdb_link'>{{fmt.nam}}</a><br>{{/fmt}}{{^fmt}}{{/fmt}}</p>{{/pbData}}{{^pbData}}<p>PaleoDB data unavailable</p>{{/pbData}}",

    templateHTML = Mustache.to_html(template, result);

    $('#fromPbDB').html(templateHTML);
    bindLink();
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
  

$('.editComment').click(function() {
  var commentID = $(this).attr('id'),
      commentText = $('#comment' + commentID).html();
  commentText = commentText.trim();
  $('#comment' + commentID).html('<form method="POST" id="updateCommentForm" action="/editComment"><input type="hidden" name="commentID" value=' + commentID + '><textarea rows="3" class="span8" name="comments">' + commentText + '</textarea><br><button class="btn btn-success" type="submit">Submit comment</button></form>');
});

$('.deleteComment').click(function() {
  var commentID = $(this).attr('id');
  $('#comment' + commentID).html('<form method="POST" id="deleteCommentForm" action="/deleteComment"><input type="hidden" name="commentID" value=' + commentID + '><button class="btn btn-success" type="submit">Submit comment</button></form>');
  document.getElementById("deleteCommentForm").submit();
});

$('.editRecord').click(function() {
  var record = $(this).attr('id');
  record = record.replace('edit', '');
  window.location.replace('/editRecord/' + record);
});
var rankMap = { 25: "unranked", 23: "kingdom", 22: "subkingdom",
    21: "superphylum", 20: "phylum", 19: "subphylum",
    18: "superclass", 17: "class", 16: "subclass", 15: "infraclass",
    14: "superorder", 13: "order", 12: "suborder", 11: "infraorder",
    10: "superfamily", 9: "family", 8: "subfamily",
    7: "tribe", 6: "subtribe", 5: "genus", 4: "subgenus",
    3: "species", 2: "subspecies" };