let scriptElements = document.querySelectorAll('script[src$="' + __BUNDLE_NAME__ + '"]');
if (scriptElements.length) {
   let src = (<HTMLScriptElement> scriptElements[0]).src;
   __webpack_public_path__ = src.substr(0, src.lastIndexOf('/') + 1);
} else if (typeof (<any> window).jsxc_public_path === 'string') {
   __webpack_public_path__ = (<any> window).jsxc_public_path;
} else {
   console.warn('Could not find script element which points to ' + __BUNDLE_NAME__ + '. JSXC is maybe not working correctly.');
}
