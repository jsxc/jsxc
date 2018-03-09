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

declare var __webpack_public_path__: string;
