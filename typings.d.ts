declare module "*.scss" {
    const resource: { [key: string]: string };
    export = resource;
}

declare module "*.png" {
    const path: string;
    export default path;
}

declare module "*.mp3";
