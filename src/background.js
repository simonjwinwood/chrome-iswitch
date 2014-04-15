
/* We don't care about the argument */
function contentListener(req, sender, sendResponse) {
    switch (req.type) {
    case 'SwitchTab':
        chrome.tabs.update(req.id, { active: true }, function (tab) { chrome.windows.update(tab.windowId, { focused: true }, function (window) {}); });
        break;
    default:
        break;
    }
    return false;
}

function withActiveTab(f) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        f(tabs[0]);
    });
}

function commandListener(command) {
    switch (command) {
    case 'iswitch':
        /* Send active tab all tabs */
        withActiveTab(function (tab) {
            chrome.tabs.query({}, function (tabs) {
                // filter out the important details ...
                var res = tabs.map(function (tab) { return { title: tab.title, url: tab.url, id: tab.id, favIconUrl: tab.favIconUrl }; });
                chrome.tabs.sendMessage(tab.id, { type: "iswitch", tabs: res });
            });
        });
        break;
    default:
        break;
    }
}

/* Callback to switch tabs */
chrome.runtime.onMessage.addListener(contentListener);
chrome.commands.onCommand.addListener(commandListener);
