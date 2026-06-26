declare module "docxtemplater-image-module" {
  interface ImageModuleOptions {
    getImage: (tagValue: string | Buffer, tagName: string) => Buffer;
    getSize: (tagValue: Buffer, tagName: string) => [number, number];
  }

  class ImageModule {
    constructor(options: ImageModuleOptions);
  }

  export default ImageModule;
}