"use strict";

import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
// import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { Grid, ColDef, GridOptions, ValueFormatterService } from 'ag-grid-community';
import 'ag-grid-enterprise'
import { ExcelExportModule } from 'ag-grid-enterprise';
import { VisualSettings } from './settings';
import { LicenseManager } from 'ag-grid-enterprise';


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
        const valueFormatter = value.column['colDef'].valueFormatter;
        return valueFormatter ? valueFormatter(value) : value.value;
    },
    onFirstDataRendered: ({api}) => api.expandAll(),
    onGridReady: ({api}) => api.sizeColumnsToFit(),
} as GridOptions;


export class Visual implements IVisual {

    private visualSettings: VisualSettings;
    private readonly element: HTMLElement;
    private gridOptions: GridOptions;
    private button: HTMLButtonElement;

    constructor(options: VisualConstructorOptions) {
    this.element = options.element;
    this.element.classList.add('ag-theme-balham');

    }

    public update(options: VisualUpdateOptions) {

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
                if(columnDefs[i].headerName == "Sum of TOTAL_ASSESS_USD"){
                    rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2)
                }
            });
            return rowData;
        });



        if(!this.gridOptions) {
            this.gridOptions = {
                ...defaultGridConfig,
                floatingFilter: true,
                columnDefs: columnDefs,
                rowData: rowData,
            } as GridOptions;

            new Grid(this.element, this.gridOptions);
        } else {
            let api = this.gridOptions.api;
            api.setColumnDefs(columnDefs);
            api.setRowData(rowData);
            api.sizeColumnsToFit();
        }
    }

}