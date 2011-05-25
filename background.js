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
(function(){
    // Navigates to the specified URL.
    function nav(url) {
        console.log("Navigating to: " + url);
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.update(tab.id, {url: url});
        });
    };

    // Sets the the default styling for the first search item
    function setDefaultSuggestion(text) {
      if (text) {
        chrome.omnibox.setDefaultSuggestion({"description":"<url><match>Basecamp:</match></url> " + text});
      } else {
        chrome.omnibox.setDefaultSuggestion({"description":"<url><match>Basecamp:</match></url>"});
      }
    };

    // Prefetch necessary data
    var basecampCache = null;
    var projects = [];


    chrome.omnibox.onInputStarted.addListener(function(){

        // console.log("Input started");
        // setDefaultSuggestion('');
        //
        // if (localStorage['basecamp_cache']) {
        //     basecamp_cache = localStorage.getObject('basecamp_cache');
        // } else {
          var bc = new Basecamp('', '');
          bc.projects({success: function( data ){
            projects = Basecamp.Project.from_xml( data );
          }});
            //
            //     for (var i = 0; i < matches.length; ++i) {
            //         ruby_api_.push({"url":url, "fqn":fqn, "name":classname});
            //     }
            //     localStorage.setObject('ruby_api', ruby_api_);
            // },
            // function (url, req) {
            //     console.log("Failed to receive: "+url);
            // }).send(null);
        // }
    });

    chrome.omnibox.onInputCancelled.addListener(function() {
        console.log("Input cancelled.");
        setDefaultSuggestion('');
    });

    setDefaultSuggestion('');

    chrome.omnibox.onInputChanged.addListener(function(text, suggest_callback) {
        setDefaultSuggestion(text);
        if (!text) {
            return;
        }

        var kMaxSuggestions = 10;
        var suggestions = [];
        var stripped_text = text.strip();
        if (!stripped_text) {
            return;
        }
        var qlower = stripped_text.toLowerCase();

        var second = [];
        var third = [];
        if (projects) {
            for (var i = 0; i < projects.length; ++i) {
                var entry = projects[i];
                var url = entry.path();
                var name = entry["name"];
                var fqn = entry["status"];
                var namelower = name.toLowerCase();
                var fqnlower = fqn.toLowerCase();
                var namestartswith = namelower.startsWith(qlower);
                var fqnstartswith = fqnlower.startsWith(qlower);
                var containsword = fqnlower.indexOf(qlower) != -1;
                if (namestartswith || fqnstartswith || containsword) {
                    var completion = {
                        "content":url,
                        "description":["<match>", name, "</match> (<match>", fqn, "</match>) - <url>", url, "</url>"].join('')
                    };
                    if (namestartswith) {
                        suggestions.push(completion);
                    } else if (fqnstartswith) {
                        second.push(completion);
                    } else {
                        third.push(completion);
                    }
                }
                if (suggestions.length >= kMaxSuggestions) {
                    break;
                }
            }
        }

        if (suggestions.length < kMaxSuggestions) {
            for (var i = 0; i < second.length; ++i) {
                suggestions.push(second[i]);
            }
        }

        if (suggestions.length < kMaxSuggestions) {
            for (var i = 0; i < third.length; ++i) {
                suggestions.push(third[i]);
            }
        }

        suggest_callback(suggestions);
    });

    chrome.omnibox.onInputEntered.addListener(function(text) {
        console.log("Input entered: " + text);
        if (!text) {
            nav("http://www.ruby-doc.org/");
            return;
        }

        var stripped_text = text.strip();
        if (!stripped_text) {
            nav("http://www.ruby-doc.org/");
            return;
        }

        if (stripped_text.startsWith("http://") || stripped_text.startsWith("https://")) {
            nav(stripped_text);
            return;
        }

        if (stripped_text.startsWith("www.") || stripped_text.endsWith(".com") || stripped_text.endsWith(".net") || stripped_text.endsWith(".org") || stripped_text.endsWith(".edu")) {
            nav("http://" + stripped_text);
            return;
        }

        var google_codesearch_suffix = " [Google Code Search]";
        if (stripped_text.endsWith(google_codesearch_suffix)) {
            var newquery = stripped_text.substring(0, stripped_text.length - google_codesearch_suffix.length).strip();
            nav("http://www.google.com/codesearch?q=" + encodeURIComponent(newquery + " lang:ruby"));
            return;
        }

        var devsearch_suffix = " [Development and Coding Search]";
        if (stripped_text.endsWith(devsearch_suffix)) {
            var newquery = stripped_text.substring(0, stripped_text.length - devsearch_suffix.length).strip();
            nav("http://www.google.com/cse?cx=005154715738920500810:fmizctlroiw&q=" + encodeURIComponent("Ruby "+newquery));
            return;
        }

        var qlower = stripped_text.toLowerCase();
        if (ruby_api_) {
            for (var i = 0; i < ruby_api_.length; ++i) {
                var entry = ruby_api_[i];
                var namelower = entry["name"].toLowerCase();
                var fqnlower = entry["fqn"].toLowerCase();
                if ((namelower == qlower) || (fqnlower == qlower)) {
                    nav(entry["url"]);
                    return;
                }
            }
        }

        nav("http://www.google.com/search?q=" + encodeURIComponent("Ruby "+stripped_text));
    });
})();