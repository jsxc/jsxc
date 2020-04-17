declare module '*.hbs' {
    // const content: any;
    // export default content;
    export default function template(options: any);
}

declare module '*.png' {
    const content: string;
    export default content;
}
declare module '*.mp3' {
    const content: string;
    export default content;
}
declare module '*.wav' {
    const content: string;
    export default content;
}
declare module '*.js?path' { }
declare module '*.svg' {
    const content: string;
    export default content;
}

declare var __webpack_public_path__: string;
declare var __VERSION__: string;
declare var __BUILD_DATE__: string;
declare var __BUNDLE_NAME__: string;
declare var __DEPENDENCIES__: string;
declare let __LANGS__: string[];
