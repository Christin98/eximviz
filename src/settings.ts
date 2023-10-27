/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import {dataViewObjectsParser} from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser =  dataViewObjectsParser.DataViewObjectsParser;

export class GridSettings {
    public gridKey: string = 'For_Trialinw_ag-Grid_Only-Not_For_Real_Development_Or_Production_Projects-Valid_Until-09_November_2023_[v2]_MTY5OTUzMjQzNjkxMg==c466ad8d9540a16242ffa5defb3dc3c9';
    public gridFilter: boolean = true;
    public gridFilterHeight: number = 20;
}

export class VisualSettings extends DataViewObjectsParser {
    public grid: GridSettings = new GridSettings();
}

// import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

// import FormattingSettingsCard = formattingSettings.Card;
// import FormattingSettingsSlice = formattingSettings.Slice;
// import FormattingSettingsModel = formattingSettings.Model;

// /**
//  * Data Point Formatting Card
//  */
// class DataPointCardSettings extends FormattingSettingsCard {
//     defaultColor = new formattingSettings.ColorPicker({
//         name: "defaultColor",
//         displayName: "Default color",
//         value: { value: "" }
//     });

//     showAllDataPoints = new formattingSettings.ToggleSwitch({
//         name: "showAllDataPoints",
//         displayName: "Show all",
//         value: true
//     });

//     fill = new formattingSettings.ColorPicker({
//         name: "fill",
//         displayName: "Fill",
//         value: { value: "" }
//     });

//     fillRule = new formattingSettings.ColorPicker({
//         name: "fillRule",
//         displayName: "Color saturation",
//         value: { value: "" }
//     });

//     fontSize = new formattingSettings.NumUpDown({
//         name: "fontSize",
//         displayName: "Text Size",
//         value: 12
//     });

//     name: string = "dataPoint";
//     displayName: string = "Data colors";
//     slices: Array<FormattingSettingsSlice> = [this.defaultColor, this.showAllDataPoints, this.fill, this.fillRule, this.fontSize];
// }

// /**
// * visual settings model class
// *
// */
// export class VisualFormattingSettingsModel extends FormattingSettingsModel {
//     // Create formatting settings model formatting cards
//     dataPointCard = new DataPointCardSettings();

//     cards = [this.dataPointCard];
// }
