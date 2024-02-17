"use strict";

import {dataViewObjectsParser} from "powerbi-visuals-utils-dataviewutils/lib/index";
import DataViewObjectsParser =  dataViewObjectsParser.DataViewObjectsParser;

export class GridSettings {
    public gridKey: string = 'For_Trialinw_ag-Grid_Only-Not_For_Real_Development_Or_Production_Projects-Valid_Until-09_November_2023_[v2]_MTY5OTUzMjQzNjkxMg==c466ad8d9540a16242ffa5defb3dc3c9';
    public gridFilter: boolean = true;
    public gridFilterHeight: number = 20;
    public gridFilterWidth: number = 150;
    public gridLabelColor: string = "#666666";
    public gridLabelDisplayUnits: number = 0;
    public gridLabelFontSize: number = 9;
    public gridLabelPrecision: number = 0;
    public gridLineColor: string = "#ddd";
    public gridLinesVisibility: boolean = false;
    public gridLinesWeight: number = 1;
    public gridOpacity: number = 1;
    public gridOutlineColor: string = "#333";
    public gridOutlineTransparency: number = 0;
    public gridOutlineWeight: number = 1;
    public gridShowHorizontalGridlines: boolean = true;
    public gridShowVerticalGridlines: boolean = true;
    public gridStyle: string = "solid";
    public gridThickness: number = 1;
}

export class VisualSettings extends DataViewObjectsParser {
    public grid: GridSettings = new GridSettings();
}