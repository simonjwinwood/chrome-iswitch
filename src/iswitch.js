
var dialog = "\
<div id='iswitch-popup' hidden>\
 <div id='iswitch-popup-body'>\
  <div id='iswitch-popup-input'><input type='text'/></div>\
  <div id='iswitch-popup-window'>\
    <div id='iswitch-popup-contents' tabindex='-1' />\
  </div>\
 </div>\
</div>";

function Model(tabs) {
    return { tabs: tabs };
}

function cycle_forward() {
    var $window = $( "#iswitch-popup-window" );
    var $current = $( "#iswitch-popup-entry-focused" );
    var $visible = $( ".iswitch-popup-entry" ).filter(":visible");

    if ( $visible.length > 0) {

        var $visibleAfter = $current.nextAll( ":visible" );
        var $next;

        if ($visibleAfter.length == 0) {
            $next = $visible.first()
        } else {
            $next = $visibleAfter.first();
        }

        $current.removeAttr("id");        
        $next.attr("id", "iswitch-popup-entry-focused");
        scroll_to($window, $next);
    } 
}

function cycle_backward() {
    var $window = $( "#iswitch-popup-window" );
    var $current = $( "#iswitch-popup-entry-focused" );
    var $visible = $( ".iswitch-popup-entry" ).filter(":visible");

    if ( $visible.length > 0) {

        var $visibleBefore = $current.prevAll( ":visible" );
        var $next;

        if ($visibleBefore.length == 0) {
            $next = $visible.last()
        } else {
            $next = $visibleBefore.first();
        }

        $current.removeAttr("id");        
        $next.attr("id", "iswitch-popup-entry-focused");
        scroll_to($window, $next);
    } 
}

function render(pred) {
    var $children = $( "#iswitch-popup-contents" ).children();

    $children.each(function (idx) {
        var visibility = "none";
    
        if ( pred( $(this).data("tab") ) ) {
            visibility = "visible";
        }

        $(this).css("display", visibility);
    });

    if ( $( "#iswitch-popup-entry-focused" ).filter(":visible").length == 0 ) {
        cycle_forward();
    }
}

function add_entries(model) {
    var $contents = $( "#iswitch-popup-contents" );
    var mkdiv = function (extraClass) { return $("<div />").addClass("iswitch-popup-entry" + extraClass); };

    $contents.empty();
    model.tabs.forEach(function (tab) {
        var $icon      = mkdiv("-icon").append( $("<img />").attr("src", tab.favIconUrl) );
        var $details   = mkdiv("-details")
                              .append( mkdiv("-title").text(tab.title) )
                              .append( mkdiv("-url").text(tab.url) )
        var $container = mkdiv("").append($icon)
                                  .append($details)
                                  .data("tab", tab); /* Record the source tab */
        $contents.append( $container );
    });

    $contents.children().first().attr("id", "iswitch-popup-entry-focused");
}

var tabKey   = { key: 9 };
var escKey   = { key: 27 };
var enterKey = { key: 13 };

var input_keymap = [
    { key: { ctrl: true, key: 83 } /* C-s */
    , action: 'cycle-forward' },
    { key: { ctrl: true, key: 82 } /* C-r */
    , action: 'cycle-backward' },
    { key: enterKey, action: 'go-to-selected' },
    { key: escKey, action: 'cleanup' }
];

var contents_keymap = [
    { key: { key: 74 } /* j */
    , action: 'cycle-forward' },
    { key: { key: 75 } /* k */
    , action: 'cycle-backward' },
    { key: enterKey, action: 'go-to-selected' },
    { key: escKey, action: 'cleanup' }
];

function scroll_to(window, element) {
    var el_top  = element.position().top - window.position().top;
    var win_rel = window.height() - element.outerHeight(true);

    if ( el_top < 0 ) { /* above? */
        window.scrollTop(window.scrollTop() + el_top);
    } else if ( el_top > win_rel ) {
        window.scrollTop( window.scrollTop() + el_top - win_rel );        
    }
}

function event_to_key(e) {
    var key = { key: e.keyCode };
    if (e.altKey)   { key.alt   = true; }
    if (e.ctrlKey)  { key.ctrl  = true; }
    if (e.shiftKey) { key.shift = true; }
    return key;
}

/* view */

function iswitch_dialog(tabs) {
    var old_focus = document.activeElement;
    var model = Model(tabs);

    /* We could also do this for every tab at startup */
    $("body").append(dialog);
    add_entries(model);

    function pred(text) {
        return (function (tab) { return tab.title.toLowerCase().indexOf( text.toLowerCase() ) != -1; }); 
    }

    function keymap(keys) {
        return (function (e) {
            var key = event_to_key(e);
            
            var a = _.find(keys, function(a) { return _.isEqual(a.key, key); });
            
            if (typeof a !== 'undefined' && actions.hasOwnProperty(a.action)) {            
                actions[a.action](model);
                e.preventDefault();
                return false;
            }
            return true;
        });
    }
    
    var $input    = $("#iswitch-popup-input > input");
    var $contents = $("#iswitch-popup-contents");
        
    function cleanup () {
        /* Don't need to clean up signals here as it is taken care of by remove? */
        $( "#iswitch-popup" ).remove();
        old_focus.focus();        
    }

    function resize_contents() {
        var height = $( "#iswitch-popup-body" ).height() - $("#iswitch-popup-input").outerHeight();
        $("#iswitch-popup-window").css("height", height);
    }

    function go_to_selected() {
        var $selected = $( "#iswitch-popup-entry-focused" );
        if ( $selected.filter(":visible").length > 0 ) {
            var id = $selected.data("tab").id;
            cleanup();
            chrome.runtime.sendMessage(null, {type: 'SwitchTab', id: id}, null, function (resp) { console.log(resp); });
        }
    }

    var actions = {
        'cycle-forward': cycle_forward,
        'cycle-backward': cycle_backward,
        'go-to-selected': go_to_selected,
        'cleanup': cleanup
    };

    /* Make tab work properly --- FIXME: figure out how to do focus management properly. */
    $input.keydown(function (e) {
        if (_.isEqual(event_to_key(e), tabKey)) {
            e.preventDefault();
            $contents.focus();
            return false;
        }
        return true;
    });

    $contents.keydown(function (e) {
        if (_.isEqual(event_to_key(e), tabKey)) {
            e.preventDefault();
            $input.focus();
            return false;
        }
        return true;
    });
    
    $input.keydown(keymap(input_keymap));
    $contents.keydown(keymap(contents_keymap));

    $input.on("input", function () {
        var text = $( this ).val();
        render(pred(text));
    });

    $( window ).on("resize.iswitch", resize_contents);

    $( "#iswitch-popup" ).show();
    resize_contents();
    
    $( "#iswitch-popup-input > input" ).focus();
}

/* We just pop up a window when we get a message */
chrome.runtime.onMessage.addListener(function(msg, _, _) {
    if (msg.type === "iswitch") {
        iswitch_dialog(msg.tabs);
    } 
});
