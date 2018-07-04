let scriptElements = document.querySelectorAll('script[src$="__BUNDLE_NAME__"]');
if (scriptElements.length) {
   let src = (<HTMLScriptElement>scriptElements[0]).src;
   __webpack_public_path__ = src.substr(0, src.lastIndexOf('/') + 1);
}
