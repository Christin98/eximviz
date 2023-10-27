import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
export declare class GridSettings {
    gridKey: string;
    gridFilter: boolean;
    gridFilterHeight: number;
}
export declare class VisualSettings extends DataViewObjectsParser {
    grid: GridSettings;
}
