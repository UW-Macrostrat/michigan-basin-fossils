function init2() {
  resize();

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

  $('.types').click(function(){
    var theID = $(this).attr("id");
    window.location.href = "/viewrecord/" + theID;
  });

  $('#loadMore').click(function(){
    $.ajax({
      type:'GET',
      url:'/api/photos/random/' + 16, 
      success: function(data) {
        var photos = data;
        //console.log(photos)
        for (var i = 0; i < photos.length; i++) {
          $('#grid').append('<div class="span3 types" id="' + photos[i].id + '" style="background-image:url(/images/main/' + photos[i].id + '.jpg);"></div>');
        };
        resize();
        $('.types').click(function(){
          var theID = $(this).attr("id");
          window.location.href = "/viewrecord/" + theID;
        });
      },
      dataType: 'jsonp', 
      async: false 
    });
  });
}

$(window).resize(function(){
  resize();
});

function resize() {
  var htmlWidth = $('html').width(),
    picWidth = htmlWidth/4 - 1;

  $('.row-fluid [class*="span3"]').css('width', picWidth + 'px');
}