interface ExtractTablesOptions {
    pdfPath: string;
    outputPath: string;
}
interface TableData {
    page: number;
    tableIndex: number;
    headers: string[];
    rows: string[][];
}
export declare class TableExtractService {
    extractTables(options: ExtractTablesOptions): Promise<TableData[]>;
    private extractTablesWithOCR;
    private extractTablesFromText;
    private preprocessText;
    private tryAlternativeTableExtraction;
    private hasNumberTextPattern;
    private isTableRow;
    private parseTableData;
    private writeToExcel;
}
export {};
//# sourceMappingURL=tableExtractService.d.ts.map