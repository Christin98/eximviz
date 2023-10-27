/*
*  Power BI Visual CLI
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

import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
// import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;

// import DataView = powerbi.DataView;
// import DataViewTable = powerbi.DataViewTable;
// import DataViewTableRow = powerbi.DataViewTableRow;
// import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;

import { Grid, ColDef, GridOptions, GridApi } from 'ag-grid-community';
import 'ag-grid-enterprise'
import { ExcelExportModule } from 'ag-grid-enterprise';
import { VisualSettings } from './settings';
import { LicenseManager } from 'ag-grid-enterprise';
import { blob } from 'd3';

// import { VisualFormattingSettingsModel } from "./settings";


var checkboxSelection = function (params) {
    // we put checkbox on the name if we are not doing grouping
    return params.columnApi.getRowGroupColumns().length === 0;
  };
  var headerCheckboxSelection = function (params) {
    // we put checkbox on the name if we are not doing grouping
    return params.columnApi.getRowGroupColumns().length === 0;
  };

const DEFAULT_DEBOUNCE_MS = 500;

const sideBar = {
    toolPanels: [
        {
            id: 'columns',
            labelDefault: 'Columns',
            labelKey: 'columns',
            iconKey: 'columns',
            toolPanel: 'agColumnsToolPanel',
        },
        {
            id: 'filters',
            labelDefault: 'Filters',
            labelKey: 'filters',
            iconKey: 'filter',
            toolPanel: 'agFiltersToolPanel',
        }
    ],
};

const defaultGridConfig = {
    sideBar,
    autoSizePadding: 0,
    enableRangeSelection: true,
    rowGroupPanelShow: 'onlyWhenGrouping',
    pivotMode: false,
    enableValue: true,
    floatingFiltersHeight: 20,
    enableAdvancedFilter: false,
    maxBlocksInCache: 2,
    pagination: true,
    paginationPageSize: 100,
    paginateChildRows: true,
    rowBuffer: 0,
    animateRows: true,
    suppressRowDeselection: false,
    rowSelection: 'multiple',
    enableCellTextSelection: false,
    suppressHorizontalScroll: false,
    enableCharts: true,
    suppressRowClickSelection: true,
    suppressAggFuncInHeader: true,
    suppressExcelExport: false,
    blockLoadDebounceMillis: DEFAULT_DEBOUNCE_MS,
    defaultColDef: {
        editable:false,
        enableRowGroup: true,
        enablePivot: true,
        enableValue: true,
        resizable: true,
        sortable: true,
        floatingFilter: true,
        suppressFiltersToolPanel: false,
        menuTabs: ['filterMenuTab','columnsMenuTab','generalMenuTab'],
        minWidth: 80,
        filter: true,
        suppressFilter: false,
        debounceMs: DEFAULT_DEBOUNCE_MS,
        filterParams: {
            suppressAndOrCondition: true,
        },
    } as ColDef,
    processCellForClipboard: value => {
        // Formatting datagrid copy cell using valueformatter for column
        // Missing feature of ag-grid - should do this by default.
        const valueFormatter = value.column['colDef'].valueFormatter;
        return valueFormatter ? valueFormatter(value) : value.value;
    },
    onFirstDataRendered: ({api}) => api.expandAll(),
    onGridReady: ({api}) => api.sizeColumnsToFit(),
} as GridOptions;

class GridApi {
    private paginationProxy: true;
    getPaginationProxy(): true {
        return this.paginationProxy;
    }
}
export class Visual implements IVisual {
    // private target: HTMLElement;
    // private updateCount: number;
    // private textNode: Text;
    // private formattingSettings: VisualFormattingSettingsModel;
    // private formattingSettingsService: FormattingSettingsService;
    // private tableElement: HTMLTableElement;

    private visualSettings: VisualSettings;
    private readonly element: HTMLElement;
    private gridOptions: GridOptions;
    private button: HTMLButtonElement;
    private gridApi: GridApi;

    constructor(options: VisualConstructorOptions,gridApi: GridApi) {
        // console.log('Visual constructor', options);
        // this.tableElement = document.createElement("table");
        // options.element.appendChild(this.tableElement);
    //     this.formattingSettingsService = new FormattingSettingsService();
    //     this.target = options.element;
    //     this.updateCount = 0;
    //     if (document) {
    //         const new_p: HTMLElement = document.createElement("p");
    //         new_p.appendChild(document.createTextNode("Update count:"));
    //         const new_em: HTMLElement = document.createElement("em");
    //         this.textNode = document.createTextNode(this.updateCount.toString());
    //         new_em.appendChild(this.textNode);
    //         new_p.appendChild(new_em);
    //         this.target.appendChild(new_p);
    //     }

    this.element = options.element;
    this.element.classList.add('ag-theme-balham');
    this.button = document.createElement("button");
    this.button.innerText = "Click Me";
    this.gridApi = gridApi;
    this.button.addEventListener('click', () => {
        this.onButtonClick();
    });
    this.element.appendChild(this.button);
    }

  
    private onButtonClick() {
        // Handle the button click event here
        // const exportParams = {
        //     skipHeader: false,
        //     columnGroups: true,
        //     skipFooters: false,
        //     skipGroups: false,
        //     skipPinnedTop: false,
        //     skipPinnedBottom: false,
        //     allColumns: true,
        //     fileName: 'exported-data.xlsx', // Provide a default file name
        // };
        // Add custom logic to interact with the data or update the visualization.
        // this.gridOptions.api.showLoadingOverlay()

        
    }

    public update(options: VisualUpdateOptions) {
        // this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);

        // console.log('Visual update', options);
        // if (this.textNode) {
        //     this.textNode.textContent = (this.updateCount++).toString();
        // }

        
        // const dataViews: DataView[] = options.dataViews;

        // console.log("dataViews", dataViews)

        // if (!dataViews || !dataViews[0]) {
        //     return;
        // }

        // const dataView: DataView = dataViews[0];
        // const table: DataViewTable = dataView.table;
        // const columns: DataViewMetadataColumn[] = table.columns;
        // const rows: DataViewTableRow[] = table.rows;
        
        // console.log("Table", table)

        // // Clear existing content
        // this.tableElement.innerHTML = "";

        // // Create table headers
        // const headerRow: HTMLTableRowElement = this.tableElement.createTHead().insertRow();
        // columns.forEach((column: DataViewMetadataColumn) => {
        //     const headerCell: HTMLTableHeaderCellElement = headerRow.insertCell();
        //     headerCell.innerText = column.displayName;
        // });

        // // Create table rows and populate with data
        // rows.forEach((row: DataViewTableRow) => {
        //     const tableRow: HTMLTableRowElement = this.tableElement.insertRow();
        //     row.forEach((cellValue, columnIndex) => {
        //         const tableCell: HTMLTableCellElement = tableRow.insertCell();
        //         tableCell.innerText = cellValue.toString();
        //     });
        // });

        let dataView = options.dataViews[0];
        const settings = this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);

           const columnDefs = dataView.table.columns.map((c, index) => {
            const columnDef = {
                headerName: c.displayName,
                field: c.displayName.replace(/\s/g, '').toLowerCase(),
            } as ColDef;
        
            if (index === 0) {
                columnDef.headerCheckboxSelection = true;
                columnDef.checkboxSelection = true;
            }
        
            return columnDef;
        });

        LicenseManager.setLicenseKey(this.visualSettings.grid.gridKey)

        const rowData = dataView.table.rows.map((row, rowIndex) => {
            const rowData = {
                // Add a unique identifier for the checkbox column
                checkboxColumn: rowIndex, // Use a unique identifier, e.g., row index
            };
            row.forEach((item, i) => {
                rowData[columnDefs[i].field] = item;
                if(item == ""){
                    rowData[columnDefs[i].field] = "NULL";
                }
            });
            return rowData;
        });

        
        // const rowData = dataView.table.rows.map(row => row.map((item, i) => ({
        //     [columnDefs[i].field]: item
        // })).reduce((a, c) => ({...a, ...c}), {}));

        if (typeof window !== 'undefined') {
            // Attach external event handlers to window so they can be called from index.html
            (<any>window).onButtonClick = this.onButtonClick;
          }

        const exportButton = document.createElement('button');
        exportButton.innerText = 'Export to Excel';
        exportButton.addEventListener('click', () => {
            this.onButtonClick();
        });

        this.element.appendChild(exportButton);

        if(!this.gridOptions) {
            this.gridOptions = {
                ...defaultGridConfig,
                floatingFilter: true,
                columnDefs: columnDefs,
                rowData: rowData,
            } as GridOptions;

            new Grid(this.element, this.gridOptions);
            this.button.addEventListener('click', () => {
                this.onButtonClick();
            });
        } else {
            let api = this.gridOptions.api;
            api.setColumnDefs(columnDefs);
            api.setRowData(rowData);
            api.sizeColumnsToFit();
        }
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    // public getFormattingModel(): powerbi.visuals.FormattingModel {
    //     return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    // }
}