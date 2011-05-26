// == Helper Prototype Extensions ==
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};
Storage.prototype.getObject = function(key) {
    return JSON.parse(this.getItem(key));
};
String.prototype.startsWith = function(str) {
    if (str.length > this.length) {
        return false;
    }
    return (String(this).substr(0, str.length) == str);
};
String.prototype.endsWith = function(str) {
    if (str.length > this.length) {
        return false;
    }
    return (String(this).substr(this.length - str.length, this.length) == str);
};
String.prototype.encode = function() {
    return encodeURIComponent(String(this));
};
String.prototype.strip = function() {
    var str = String(this);
    if (!str) {
        return "";
    }
    var startidx=0;
    var lastidx=str.length-1;
    while ((startidx<str.length)&&(str.charAt(startidx)==' ')){
        startidx++;
    }
    while ((lastidx>=startidx)&&(str.charAt(lastidx)==' ')){
        lastidx--;
    }
    if (lastidx < startidx) {
        return "";
    }
    return str.substring(startidx, lastidx+1);
};

// == Autocompletion Chrome Extension ==
(function() {
  var basecampURL    = localStorage['basecamp_url'],
      apiToken       = localStorage['api_token'],
      basecampAPI    = new Basecamp( basecampURL, apiToken ),
      basecampCache  = null,
      projects       = [],
      suggestions    = [],
      topResult      = null;

  // Navigates to the specified URL.
  function navigate(url) {
    console.log("Navigating to: " + url);
    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.update(tab.id, {url: url});
    });
  };

  function getURL( path ) {
    return basecampURL + path;
  }

  // Sets the the default styling for the first search item
  function setDefaultSuggestion(text) {
    chrome.omnibox.setDefaultSuggestion({
      description: '<url><match>Basecamp:</match></url> ' + (text || '<match>project name</match>')
    });
  };

  function handleOnInputStarted(){
    console.log("Input started");
    setDefaultSuggestion('');
    suggestions = [];
    basecampAPI.projects({
      success: function( data ){ projects = Basecamp.Project.from_xml( data ); }
    });
  }

  function handleOnInputCanceled() {
      console.log("Input cancelled.");
      setDefaultSuggestion('');
  }

  function handleOnInputChanged( text, suggest_callback ) {
    text        = text.strip();
    suggestions = [];
    var qlower  = text.toLowerCase();

    setDefaultSuggestion( text );
    if ( !text ) { return; }

    if ( projects ) {
      for (var i = 0; i < projects.length; ++i) {
        var entry          = projects[i],
            url            = entry.path(),
            name           = entry["name"],
            status         = entry["status"],
            namelower      = name.toLowerCase(),
            namestartswith = namelower.startsWith(qlower),
            containsword   = namelower.indexOf(qlower) != -1,
            completion = {
              "content": name,
              "description":["<match>", name, "</match> (<match>", status, "</match>) - <url>", url, "</url>"].join('')
            };
        if (namestartswith) {
          suggestions.unshift(completion);
          topResult = url;
        } else if ( containsword ) {
          suggestions.push ( completion );
        }
      }
    }
    suggest_callback(suggestions);
  }

  function handleOnInputEntered( text ) {
    console.log("Input entered: " + text);
    for (var i = 0; i < projects.length; i++) {
      if (projects[i]['name'] === text) {
        return navigate(getURL( projects[i].path()));
      }
    }
    navigate(getURL(topResult || ""));
  }

  // Register event listeners
  chrome.omnibox.onInputStarted.addListener( handleOnInputStarted );
  chrome.omnibox.onInputCancelled.addListener( handleOnInputCanceled);
  chrome.omnibox.onInputChanged.addListener( handleOnInputChanged );
  chrome.omnibox.onInputEntered.addListener( handleOnInputEntered );
})();