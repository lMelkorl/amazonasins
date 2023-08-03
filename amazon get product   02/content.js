function getAmazonURL() {
    var productLink = document.querySelector('a.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal');
    console.log(productLink)
    if (productLink) {
        return productLink.href;
    }
    return null;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "getAmazonURL") {
        var url = getAmazonURL();
        sendResponse({ url: url });
    }
});
