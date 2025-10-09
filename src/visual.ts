"use strict";

import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
// import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;


import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;


import { ColDef, GridOptions, createGrid, GridApi } from 'ag-grid-community';
import 'ag-grid-enterprise'
import { VisualSettings } from './settings';
import { LicenseManager } from 'ag-grid-enterprise';


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
    suppressExcelExport: true,
    blockLoadDebounceMillis: DEFAULT_DEBOUNCE_MS,
    statusBar: {
        statusPanels: [
          { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
          { statusPanel: "agTotalRowCountComponent", align: "center" },
          { statusPanel: "agFilteredRowCountComponent", align: "right" }
        ]
      },
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
    private host: IVisualHost;
    private visualSettings: VisualSettings;
    private element: HTMLElement;
    private gridOptions: GridOptions;
    private api: GridApi
    private button: HTMLButtonElement;
    private allRowData: any[] = [];
    private columnDefinitions: ColDef[] = [];
    private isFetchingMoreData: boolean = false;

    constructor(options: VisualConstructorOptions) {
    this.element = options.element;
    this.element.style.display = "flex"
    this.element.style.flexDirection = "column"
    this.element.classList.add('ag-theme-balham');
    this.button = document.createElement('button')
    this.button.innerHTML = 'Download Excel'
    this.element.appendChild(this.button);
    this.host = options.host;
}

    public update(options: VisualUpdateOptions) {
        let dataView = options.dataViews[0];
        console.log(dataView)

        if (!dataView || !dataView.table) {
            return;
        }

        this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);

        // Check if this is a new data load (reset accumulated data)
        if (options.type === 2 /* Data */) {
            console.log("New data load - resetting accumulated data");
            this.allRowData = [];
            this.isFetchingMoreData = false;
        }

        const currencyFormatter = (params) => {  return '$' + formatNumber(params.value);}
        const numberFormatter = (params) => { return '' + formatNumber(params.value)}
        const stringFormatter = (params) => { return formatString(params.value)}
        const percentageFormatter = (params) => { return formatPercentage(params.value) + "%"}


        const formatString = (string) => {
            console.log(string)
            if (string === undefined || string === null || string === "") {
                return "NULL"
            }

            return string
        }

        const formatNumber = (number) => { 
            console.log(number)
            if (number === undefined || number === null) {
                return 0;
            }
        
            // Add commas and round to 2 decimal places
            return Number(number).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }

        const formatPercentage = (number) => { 
            console.log(number)
            if (number === undefined || number === null) {
                return 0;
            }
        
            // Add commas and round to 2 decimal places
            return Number(number).toFixed(4);
        }

           const columnDefs = dataView.table.columns.map((c, index) => {
            const columnDef = {
                headerName: c.displayName,
                field: c.displayName.replace(/\s/g, '').toLowerCase(),
            } as ColDef;

            if(c.isMeasure) {
                console.log("True");
                if(c.displayName.includes("usd") || c.displayName.includes("USD")|| c.displayName.includes("duty") || c.displayName.includes("DUTY"))
                    columnDef.valueFormatter = currencyFormatter;
                else if(c.displayName.includes("percentage") || c.displayName.includes("PERCENTAGE"))
                    columnDef.valueFormatter = percentageFormatter;
                else
                    columnDef.valueFormatter = numberFormatter;
                columnDef.enableValue = true
                columnDef.enablePivot = true
                columnDef.cellDataType = 'number'
                columnDef.aggFunc = 'sum'
            } else {
                console.log("False");
                columnDef.valueFormatter = stringFormatter;
                columnDef.cellDataType = 'text'
                columnDef.enablePivot = false
                columnDef.enableRowGroup = true
                columnDef.enableValue = false
            }

            if (index === 0) {
                columnDef.headerCheckboxSelection = true;
                columnDef.checkboxSelection = true;
            }

            return columnDef;
        });

        LicenseManager.setLicenseKey(this.visualSettings.grid.gridKey)

        // Store column definitions for later use
        if (this.columnDefinitions.length === 0) {
            this.columnDefinitions = columnDefs;
        }

        // Convert current segment rows to row data
        const currentSegmentRows = dataView.table.rows.map((row, rowIndex) => {
            const currentRowIndex = this.allRowData.length + rowIndex;
            const rowData = {
                // Add a unique identifier for the checkbox column
                checkboxColumn: currentRowIndex, // Use a unique identifier, e.g., row index
            };
            row.forEach((item, i) => {
                rowData[columnDefs[i].field] = item;
            //     if(columnDefs[i].headerName === "TOTAL_ASSESS_USD"){
            //         rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2);
            //         if(item == ""){
            //             rowData[columnDefs[i].field] = "0";
            //         }
            //     }
            //     if(columnDefs[i].headerName === "FOB_USD"){
            //        console.log(rowData[columnDefs[i].field])
            //         // rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2)
            //         rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2)
            //     }
            //         if(columnDefs[i].headerName == "TOTAL_ASSESS_USD_PERCENTAGE"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(2)+"%"
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "FOB_PERCENTAGE"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(3)+"%"
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "STD_QUANTITY_PERCENTAGE"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(3)+"%"
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "STD_QUANTITY"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(2);
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "UNIT_PRICE_USD"){
            //             rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2);
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }

            //     if(item == ""){
            //         rowData[columnDefs[i].field] = "NULL";
            //     }
            });
            return rowData;
        });

        // Accumulate row data from current segment
        this.allRowData = this.allRowData.concat(currentSegmentRows);
        console.log(`Loaded ${currentSegmentRows.length} rows in this segment. Total accumulated: ${this.allRowData.length}`);

        // Check if there's more data to fetch
        const hasMoreData = dataView.metadata && dataView.metadata.segment;

        if (hasMoreData && !this.isFetchingMoreData) {
            console.log("More data available - fetching next segment...");
            this.isFetchingMoreData = true;
            this.host.fetchMoreData();
            // Don't update grid yet, wait for more data
            return;
        } else if (!hasMoreData) {
            console.log(`All data loaded! Total rows: ${this.allRowData.length}`);
            this.isFetchingMoreData = false;
        }

        // Update grid with all accumulated data
        const rowData = this.allRowData;

        if(!this.gridOptions) {
            this.gridOptions = {
                ...defaultGridConfig,
                floatingFilter: true,
                columnDefs: columnDefs,
                rowData: rowData,
            } as GridOptions;

            this.api = createGrid(this.element, this.gridOptions);

            console.log(this.api.getColumnState());

            this.button.onclick = () => {
                console.log(this.api.getColumnState());

                // Get selected rows, or all displayed rows if none selected
                const selectedNodes = this.api.getSelectedNodes();
                let dataToExport = [];

                if (selectedNodes.length > 0) {
                    // Export selected rows
                    dataToExport = selectedNodes.map(node => node.data);
                } else {
                    // Export all displayed rows (filtered/sorted)
                    const displayedRowCount = this.api.getDisplayedRowCount();
                    for (let i = 0; i < displayedRowCount; i++) {
                        const rowNode = this.api.getDisplayedRowAtIndex(i);
                        if (rowNode) {
                            dataToExport.push(rowNode.data);
                        }
                    }
                }

                // Limit to 1000 rows maximum
                const MAX_ROWS = 1000;
                if (dataToExport.length > MAX_ROWS) {
                    console.warn(`Export limited to ${MAX_ROWS} rows. Total rows: ${dataToExport.length}`);
                    dataToExport = dataToExport.slice(0, MAX_ROWS);
                }

                // Get column definitions to build the export data dynamically
                const columnDefs = this.api.getColumnDefs();

                // Transform data to use display names as keys (excluding checkbox column)
                const exportData = dataToExport.map(rowData => {
                    const exportRow = {};
                    columnDefs.forEach(colDef => {
                        // Type guard to ensure it's a ColDef (not ColGroupDef)
                        if ('field' in colDef && colDef.field && colDef.field !== 'checkboxColumn' && colDef.headerName) {
                            // Use headerName as key and get the value from the row data
                            exportRow[colDef.headerName] = rowData[colDef.field];
                        }
                    });
                    return exportRow;
                });

                console.log("Export data:", exportData);
                console.log("Exporting", exportData.length, "rows");

                const jsonString = JSON.stringify(exportData);
                const requestBody = {
                    name: jsonString
                };

                console.log(JSON.stringify(requestBody));
                const downloadlink = `https://func-exim-powerbi-ci-prod.azurewebsites.net/api/downloadlink`;

                fetch(downloadlink, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }).then(response => response.text())
                .then(result => {
                    const url = `https://func-exim-powerbi-ci-prod.azurewebsites.net${result}`
                    console.log(url)
                    this.host.launchUrl(url)
                })
                .catch(error => console.log('error', error));
            }
        } else {
            this.api.setGridOption("columnDefs",columnDefs);
            this.api.setGridOption("rowData",rowData);
            this.api.sizeColumnsToFit();
        }
    }

}