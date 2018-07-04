import './bootstrap/webpackPublicPath'
import './bootstrap/plugins'
import * as v1 from './api/v1'

let defaultApi = {
   ...v1,
   version: __VERSION__,
};

export = defaultApi;
