import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
export declare class GridSettings {
    gridKey: string;
    gridFilter: boolean;
    gridFilterHeight: number;
    gridFilterWidth: number;
    gridLabelColor: string;
    gridLabelDisplayUnits: number;
    gridLabelFontSize: number;
    gridLabelPrecision: number;
    gridLineColor: string;
    gridLinesVisibility: boolean;
    gridLinesWeight: number;
    gridOpacity: number;
    gridOutlineColor: string;
    gridOutlineTransparency: number;
    gridOutlineWeight: number;
    gridShowHorizontalGridlines: boolean;
    gridShowVerticalGridlines: boolean;
    gridStyle: string;
    gridThickness: number;
}
export declare class VisualSettings extends DataViewObjectsParser {
    grid: GridSettings;
}
