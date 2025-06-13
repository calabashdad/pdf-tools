interface ConvertToImagesOptions {
    pdfPath: string;
    outputPath: string;
}
interface AddWatermarkOptions {
    pdfPath: string;
    watermarkText: string;
    outputPath: string;
}
interface InsertBlankPageOptions {
    pdfPath: string;
    pageIndex: number;
    outputPath: string;
}
interface AddTextOptions {
    pdfPath: string;
    text: string;
    x: number;
    y: number;
    pageIndex: number;
    outputPath: string;
}
export declare class PdfService {
    convertToImages(options: ConvertToImagesOptions): Promise<string[]>;
    addWatermark(options: AddWatermarkOptions): Promise<void>;
    insertBlankPage(options: InsertBlankPageOptions): Promise<void>;
    addText(options: AddTextOptions): Promise<void>;
    createImagesZip(imagePaths: string[], outputZipPath: string): Promise<string>;
}
export {};
//# sourceMappingURL=pdfService.d.ts.map