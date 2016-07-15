// Initialize app
var myApp = new Framework7({
    modalUsernamePlaceholder: __n['modalUsername']
});
 
// If we need to use custom DOM library, let's save it to $$ variable:
var $ = Dom7;
 
// Add view
var mainView = myApp.addView('.view-main', {
  // Because we want to use dynamic navbar, we need to enable it for this view:
  dynamicNavbar: true
});

var apis = null;
var deviceToken = window.location.href.match(/dToken=(.*)/i)[1];

function triggerSignIn(){
  $(document).trigger('signin');
}

function triggerSignOut(){
  $(document).trigger('signout');
}

function isSignedIn() {
    // if (getUserToken() !== null && getUserToken() !== undefined) {
        window.location = 'toolbar://login/signin/success';
    // } else {
    //     window.location = 'toolbar://login/signout/success';
    // }
    //return true;
  //return getUserToken() !== null && getUserToken() !== undefined;
}

function getUserToken() {
  return localStorage.getItem('user_auth');
}


(function(){  

  function addLocation(location) {
    var html = cLocationTemplate({
      'id' : location.id,
      'imageUrl' : location.logo_url
    });

    $('#locationsWrapper').append(html);
    _locations[location.id] = location;
  }

  function verifyCode(code, locationId, userToken) {
    
    function onSuccess(result){
      processCheckins(result['checkins'], true);
      myApp.hidePreloader();

      if (areAllCheckedIn()) {
        myApp.alert(__n['modalAllCheckedInBody'], __n['modalAllCheckedInTitle']);
      }
    
      // Display an error message if the checkin failed / or success message on checkin
      if (result['checked_in'] === false) {
        myApp.alert(__n['modalCheckinVerificationFailBody'], __n['modalCheckinVerificationFailTitle']);        
      } else {
        
        myApp.alert(__n['modalVerificationSuccessBody'], __n['modalVerificationSuccessTitle']);        
      }
      
      
    }

    function onFail(){
      myApp.hidePreloader();
      myApp.alert(__n['modalCheckinFailBody'], __n['modalCheckinFailTitle']);
     
    }

    myApp.showPreloader(__n["modalEnterCodeBusy"]);


    $.ajax({
      url: host + apis['verify_code'],
      dataType: 'json',
      method: 'POST',
      data: {
        'location_id' : locationId,
        'code' : code,
        'device_token': deviceToken,
        'user_token': userToken
      },
      success: onSuccess,
      error: onFail
    });
  }

  function onLocationClicked() {
    var locationId = $(this).attr('location-id');

    myApp.prompt(__n['modalEnterCodeMessage'], __n['modalEnterCodeTitle'], function (value) {
      // verify todays code here.
      verifyCode(value, locationId, getUserToken());
    });
  }

  function refreshEvents(){
    $('.location:not(.visited)').on('click', onLocationClicked);
  }

  function refreshProperties(){
    $.getJSON(host + endPoint, null, function(result) {
      // need to implement caching of properties.
      lp = result['loyalty_programs'][programName];

      if (lp === undefined) {
        throw "Loyalty program does not exist";
      }

      var lp = result['loyalty_programs'][programName];
      lp['details']['locations'].forEach(function(location){
        addLocation(location);
        apis = lp['details']['endpoints'];
      });

      refreshEvents();
      fetchCheckins();

    }, 'json');


  }
  
  function processCheckins(locations, animate) {
    // Default animations to false.
    if (animate == undefined) {
        animate = false;
    }
    
    // If they passed in the locations then reset the cached version with those.
    if (locations !== null) {
      _checkedInLocations = locations;
    }

    // Loop over all our locations and change the class to those found to active.
    for (var id in _checkedInLocations) {

      var location = $('.location[location-id="' + id + '"]');

      if (animate && location.hasClass('visited') === false) {
        location.find('img').addClass('animated tada');
      }

      
      location.
        addClass('visited').
        off('click', onLocationClicked);
    }

    if (areAllCheckedIn()){
      $('.checkin-complete').show();
    }
  }

  function areAllCheckedIn() {
    // Return true if all locations are visted false otherwise.
    var checkedIn = Object.keys(_checkedInLocations);
    var locations = Object.keys(_locations);

    // If there are no locations then answer is always false.
    if (locations.length === 0) {
      return false;
    }

    // Loop over locations and check the checkin object if key is missing - then answer is no.
    for (var x in locations) {
      var val = locations[x];
      if (_checkedInLocations[val] === undefined) {
        return false;
      }
    }

    // Otherwise they've past all our tests return true.
    return true;
  }

  function fetchCheckins(){

    function onSuccess(result) {
      processCheckins(JSON.parse(result));
    }

    $.post(host + apis['checkins'], {device_token: deviceToken, user_token: getUserToken()}, onSuccess);
  }

  function onCreateAccountClicked(e){
    document.title = "Create An Account";
    mainView.router.loadPage('sign-up.html');
  }

  function onSignInClicked(e){
    // Display Buttons 
    var buttons = [
      [
        {
          'text' : __n['btnActionSignIn'],
          'onClick' : showSignIn
        },
        {
          'text': __n['btnActionCreateAccount'],
          onClick: onCreateAccountClicked
        }
      ], 
      [
        {
          'text': __n['btnActionCancel']
        }
      ]
    ];

    myApp.actions(buttons);

  }
  
  
  function onSignOutClicked() {
    //localStorage.removeItem('user_auth');
    window.location = 'toolbar://login/signout/success';
  }
  
  function showSignIn(e){
    myApp.modalLogin('', __n['modalLoginTitle'], processSignIn);
  }
  

  function onSignInSuccess(result) {
    // Store our auth token in our user auth.
    localStorage.setItem('user_auth', result['user']['auth_token']);
    
    // Hide preloader.
    myApp.hidePreloader();
    
    // Update the toolbar callback.
    window.location = 'toolbar://login/signin/success';
  }

  function onSignInError(result) {
    myApp.hidePreloader();
    failedLogin();

  }

  function processSignIn(username, password){
    console.log(username, password);
    myApp.showPreloader(__n['modalSignInBusy']);
    Update the toolbar callback.
    $.ajax({
      url: host + apis['sign-in'],
      data: {username: username, password: password, device_token: deviceToken},
      method: 'POST',
      dataType: 'json',
      success: onSignInSuccess,
      error: onSignInError
    });

    
  }
  function processForgetPassword(){
      alert("yo")
  }

  // Get the json 
  var endPoint = '/api/v2/twinpines/loyalty_programs.json';
  var programName = 'dining-passport';
  
  var _checkedInLocations = {};
  var _locations = {};

  try{
    refreshProperties();
  } catch (ex) {
    // handle failures here.
  }


  var locationTemplate = $('script#locationTemplate').html();
  var cLocationTemplate = Template7.compile(locationTemplate);

  // Attach sign in handler
  $(document).on('signin', onSignInClicked);
  $(document).on('signout', onSignOutClicked);
  
  $('#signIn').on('click', triggerSignIn);

})();