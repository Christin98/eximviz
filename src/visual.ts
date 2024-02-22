"use strict";

import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
// import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
// import {currencyFormatter, numberFormatter,stringFormatter,percentageFomratter} from './formatText'


import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
// import IDownloadService = powerbi.extensibility.IDownloadService;


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
      overlayLoadingTemplate: '<div aria-live="polite" aria-atomic="true" style="position:absolute;top:0;left:0;right:0; bottom:0; background: url(https://raw.githubusercontent.com/Christin98/eximviz/feature/groupbyexcel/src/imageloader/loading-spinner.svg) center no-repeat" aria-label="loading"></div>',
      overlayNoRowsTemplate: '<span aria-live="polite" aria-atomic="true" style="padding: 10px; border: 2px solid #666; background: #55AA77;"\'No rows\' to show.</span>',
    defaultColDef: {
        editable:false,
        enableRowGroup: true,
        enablePivot: false,
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
    // private downloadservice : IDownloadService;

    constructor(options: VisualConstructorOptions) {
    this.element = options.element;
    this.element.style.display = "flex"
    this.element.style.flexDirection = "column"
    // this.downloadservice = options.host.downloadService
    this.element.classList.add('ag-theme-balham');
    this.button = document.createElement('button')
    this.button.innerHTML = 'Download Excel'
    this.element.appendChild(this.button);
    this.host = options.host;
}

    public update(options: VisualUpdateOptions) {
        
        let dataView = options.dataViews[0];
        const settings = this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);

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
                if(c.displayName.includes("usd") || c.displayName.includes("USD")|| c.displayName.includes("duty") || c.displayName.includes("DUTY"))
                    columnDef.valueFormatter = currencyFormatter;
                else if(c.displayName.includes("percentage") || c.displayName.includes("PERCENTAGE"))
                    columnDef.valueFormatter = percentageFormatter;
                else
                    columnDef.valueFormatter = numberFormatter;
                // aggereagtion of values
                // columnDef.enableValue = true
                columnDef.cellDataType = 'number'
                columnDef.aggFunc = 'sum'
            } else {
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
        const rowData = dataView.table.rows.map((row, rowIndex) => {
            const rowData = {
                checkboxColumn: rowIndex,
            };
            row.forEach((item, i) => {
                rowData[columnDefs[i].field] = item;
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
            
            this.api = createGrid(this.element, this.gridOptions);

            this.button.onclick = () => {

                let jsonString;
                let requestBody = {};

                this.api.showLoadingOverlay();

                // Get column Properties
                const paginationPageSize = this.gridOptions.paginationPageSize; 
                const currentPage = this.api.paginationGetCurrentPage();
                console.log("current page",currentPage)
                const startRow = currentPage * paginationPageSize;
                const startrowgroup = startRow +1;
                console.log("startRow",startRow)
                const endRow = Math.min(startRow + paginationPageSize, this.api.getDisplayedRowCount());
                console.log(endRow)
                let columnProperties = []
                var rowGropuFlag = false;
                var columnState = this.api.getColumnState();
                for (let i = 0 ; i < columnState.length; i++ ){
                    if(columnState[i]['rowGroup'] === true){
                        rowGropuFlag = true;
                        columnProperties.push({"columnName":  columnState[i]['colId'].toUpperCase(),
                                "rowIndex": columnState[i]['rowGroupIndex']}
                                )
                    }
                }
               
                if(rowGropuFlag === false){
                const displayedData = []
                    for (let i = startRow; i < endRow; i++) {
                        const rowNode = this.api.getDisplayedRowAtIndex(i);
                        displayedData.push(rowNode.data);
                    }                     
            
                const jsonData1: string = JSON.stringify(displayedData);

                const jsonData2: any[] = JSON.parse(jsonData1);
                const extractedValues = jsonData2.map(item => ({
                    IMPORTER_NAME: item.importer_name ,
                    SUPPLIER_NAME: item.supplier_name ,
                    HS_CODE: item.hs_code  ,
                    ORIGIN_COUNTRY: item.origin_country ,
                    PORT_OF_SHIPMENT: item.port_of_shipment,
                    FOREIGN_PORT :item.foreign_port,
                    INDIAN_PORT: item.indian_port,
                    TOTAL_ASSESS_USD: item.total_assess_usd,
                    STD_QUANTITY: item.std_quantity,
                    QUANTITY: item.quantity,
                    EXPORTER_NAME :item.exporter_name,
                    BUYER_NAME : item.buyer_name,
                    FOB_PERCENTAGE: item.fob_percentage,
                    PERCENTAGE_OF_STD_QUANTITY:item.std_quantity_percentage,
                    QUANTITY_PERCENTAGE: item.quantity_percentage,
                    FOB_USD:item.fob_usd,
                    IEC:item.iec,
                    UNIT_PRICE_USD:item.unit_price_usd,
                    TOTAL_DUTY_PAID:item.total_duty_paid,
                    TOTAL_ASSESS_VALUE_PERCENTAGE:item.total_assess_value_percentage,
                    COMMERCIAL_QUANTITY:item.commercial_quantity,
                    CUSTOM:item.custom,
                    GROSS_WEIGHT:item.gross_weight,
                }))

                interface ImportData {
                    "IMPORTER_NAME" : string,
                    "SUPPLIER_NAME" : string,
                    "HS_CODE"       : string,
                    "ORIGIN_COUNTRY" :string,
                    "PORT_OF_SHIPMENT":string,
                    "INDIAN_PORT": string,
                    "TOTAL_ASSESS_USD": number,
                    "STD_QUANTITY": number,
                    "QUANTITY": number,
                    "EXPORTER_NAME": string,
                    "BUYER_NAME":string,
                    "FOB_PERCENTAGE":number,
                    "PERCENTAGE_OF_STD_QUANTITY": number,
                    "FOB_USD":number,
                    "FOREIGN_PORT":string,
                    "UNIT_PRICE_USD":number,
                    "IEC":number,
                    "TOTAL_DUTY_PAID": number,
                    "TOTAL_ASSESS_VALUE_PERCENTAGE":number,
                    "COMMERCIAL_QUANTITY":number,
                    "CUSTOM":string,
                    "GROSS_WEIGHT":number,
                }
                const jsonData: ImportData[] = [];

                for(let i = 0; i< extractedValues.length ;i++ ){
                const entry: ImportData = 
                    {
                        HS_CODE: extractedValues[i]?.HS_CODE,
                        IMPORTER_NAME: extractedValues[i]?.IMPORTER_NAME ,
                        INDIAN_PORT: extractedValues[i]?.INDIAN_PORT ,
                        FOREIGN_PORT:extractedValues[i]?.FOREIGN_PORT,
                        ORIGIN_COUNTRY: extractedValues[i]?.ORIGIN_COUNTRY ,
                        PORT_OF_SHIPMENT: extractedValues[i]?.PORT_OF_SHIPMENT ,
                        STD_QUANTITY: extractedValues[i]?.STD_QUANTITY ,
                        QUANTITY: extractedValues[i]?.QUANTITY ,
                        SUPPLIER_NAME: extractedValues[i]?.SUPPLIER_NAME ,
                        TOTAL_ASSESS_USD: extractedValues[i]?.TOTAL_ASSESS_USD,
                        EXPORTER_NAME:extractedValues[i]?.EXPORTER_NAME,
                        BUYER_NAME:extractedValues[i]?.BUYER_NAME,
                        FOB_PERCENTAGE:extractedValues[i]?.FOB_PERCENTAGE,
                        FOB_USD:extractedValues[i]?.FOB_USD,
                        PERCENTAGE_OF_STD_QUANTITY:extractedValues[i]?.PERCENTAGE_OF_STD_QUANTITY,
                        IEC:extractedValues[i]?.IEC,
                        UNIT_PRICE_USD:extractedValues[i]?.UNIT_PRICE_USD,
                        TOTAL_DUTY_PAID: extractedValues[i]?.TOTAL_DUTY_PAID,
                        TOTAL_ASSESS_VALUE_PERCENTAGE:extractedValues[i]?.TOTAL_ASSESS_VALUE_PERCENTAGE,
                        COMMERCIAL_QUANTITY:extractedValues[i].COMMERCIAL_QUANTITY,
                        CUSTOM : extractedValues[i].CUSTOM,
                        GROSS_WEIGHT: extractedValues[i].GROSS_WEIGHT,
                    }
                
                jsonData.push(entry)
            }
                jsonString = JSON.stringify(jsonData);  
                requestBody = {
                    name: jsonString,
                    columnProperties:columnProperties
                  };      
            }

            else if (rowGropuFlag === true) {
                let previousImporterName = '';
                let indexCounter = 0;
                let columnNameIndex;
                let currentColumnNameIndex;
                let currentImporterName;
                for (let i = 0; i < columnProperties.length; i++) {
                    if (columnProperties[i]["rowIndex"] == 0) {
                        columnNameIndex = columnProperties[i]["columnName"].toLowerCase();
                    }
                }

                var allRowData = [];
                let aggValues = [];

                this.api.forEachNode(function (node) {
                    if (node && node.data) {
                        currentColumnNameIndex = columnNameIndex;
                        currentImporterName = node.data[currentColumnNameIndex]
                
                        if (currentImporterName !== undefined && currentImporterName !== previousImporterName) {
                            indexCounter++;
                        }              
                        node.data["index"] = indexCounter;
                        allRowData.push(node.data);
                
                        const node_data_agg = node.parent ? node.parent.aggData : null;
                
                        if (node_data_agg) {
                            Object.keys(node.data).forEach(function (key) {
                                Object.keys(node_data_agg).forEach(function (key_agg) {
                                    if (key === key_agg) {
                                        node.data[key + "_agg"] = node_data_agg[key_agg].toFixed(4);
                                        aggValues.push(key + "_agg");
                                    }
                                });
                            });
                        }
                        node.data[""] = "";
                    }
                    if(node.data != undefined){
                        console.log(currentColumnNameIndex)
                        previousImporterName = node.data[currentColumnNameIndex];
                    }
                    // console.log("previous:",previousImporterName)
                });

                console.log(allRowData);

                let aggValuesSet = new Set(aggValues);
                const aggValueArray = Array.from(aggValuesSet);
                const colLen = columnProperties.length;

                for (var i = 0; i < aggValueArray.length; i++) {
                    if (aggValueArray[i]) {
                        columnProperties.push({
                            "columnName": aggValueArray[i].toUpperCase(),
                            "rowIndex": i + colLen
                        });
                    }
                }
                columnProperties.push({
                    "columnName": "index",
                    "rowIndex": columnProperties.length
                })
                const collenp = columnProperties.length
                columnProperties.push({
                    "columnName": "",
                    "rowIndex": collenp
                });

                console.log(columnProperties);
            const jsonData1: string = JSON.stringify(allRowData);
            const jsonData2 :any = JSON.parse(jsonData1);
            interface ImportData {
                "IMPORTER_NAME" : string,
                "SUPPLIER_NAME" : string,
                "HS_CODE"       : string,
                "ORIGIN_COUNTRY" :string,
                "PORT_OF_SHIPMENT":string,
                "INDIAN_PORT": string,
                "TOTAL_ASSESS_USD": number,
                "STD_QUANTITY": number,
                "STD_QUANTITY_AGG":string,
                "QUANTITY": number,
                "QUANTITY_AGG":string,
                "TOTAL_ASSESS_USD_AGG":string,
                "UNIT_PRICE_USD_AGG":string,
                "EXPORTER_NAME": string,
                "BUYER_NAME":string,
                "FOB_PERCENTAGE":number,
                "FOB_PERCENTAGE_AGG":string,
                "QUANTITY_PERCENTAGE": number,
                "FOB_USD":number,
                "FOB_USD_AGG":string,
                "FOREIGN_PORT":string,
                "UNIT_PRICE_USD":number,
                "IEC":number,
                "TOTAL_ASSESS_VALUE_PERCENTAGE":number,
                "TOTAL_ASSESS_VALUE_PERCENTAGE_AGG":string,
                "TOTAL_DUTY_PAID": number,
                "TOTAL_DUTY_PAID_AGG": string,
                "COMMERCIAL_QUANTITY":number,
                "COMMERCIAL_QUANTITY_AGG":string,
                "CUSTOM":string,
                "GROSS_WEIGHT":number,
                "GROSS_WEIGHT_AGG":string,
                "":string
                "index":number
            }
            const extractedValues = jsonData2.map(item => {
                const entry: Partial<ImportData> = {};
              
                if ('importer_name' in item) entry.IMPORTER_NAME = item.importer_name || null;
                if ('supplier_name' in item) entry.SUPPLIER_NAME = item.supplier_name || null;
                if ('hs_code' in item) entry.HS_CODE = item.hs_code || null;
                if ('origin_country' in item) entry.ORIGIN_COUNTRY = item.origin_country || null;
                if ('port_of_shipment' in item) entry.PORT_OF_SHIPMENT = item.port_of_shipment || null;
                if ('foreign_port' in item) entry.FOREIGN_PORT = item.foreign_port || null;
                if ('indian_port' in item) entry.INDIAN_PORT = item.indian_port || null;
                if ('total_assess_usd' in item) entry.TOTAL_ASSESS_USD = item.total_assess_usd || null;
                if ('total_duty_paid' in item) entry.TOTAL_DUTY_PAID = item.total_duty_paid || null;
                if ('std_quantity' in item) entry.STD_QUANTITY = item.std_quantity || null;
                if ('quantity' in item) entry.QUANTITY = item.quantity || null;
                if ('exporter_name' in item) entry.EXPORTER_NAME = item.exporter_name || null;
                if ('buyer_name' in item) entry.BUYER_NAME = item.buyer_name || null;
                if ('fob_percentage' in item) entry.FOB_PERCENTAGE = item.fob_percentage || null;
                if ('fob_percentage_agg' in item) entry.FOB_PERCENTAGE_AGG = item.fob_percentage_agg || null;
                if ('quantity_percentage' in item) entry.QUANTITY_PERCENTAGE = item.std_quantity_percentage || null;
                if ('fob_usd' in item) entry.FOB_USD = item.fob_usd || null;
                if ('fob_usd_agg' in item) entry.FOB_USD_AGG = item.fob_usd_agg || null;
                if ('iec' in item) entry.IEC = item.iec || null;
                if ('unit_price_usd' in item) entry.UNIT_PRICE_USD = item.unit_price_usd || null;
                if ('total_assess_value_percentage' in item) entry.TOTAL_ASSESS_VALUE_PERCENTAGE = item.total_assess_value_percentage || null;
                if ('total_assess_value_percentage_agg' in item) entry.TOTAL_ASSESS_VALUE_PERCENTAGE_AGG = item.total_assess_value_percentage_agg || null;
                if ('std_quantity_agg' in item) entry.STD_QUANTITY_AGG = item.std_quantity_agg || null;
                if ('quantity_agg' in item) entry.QUANTITY_AGG = item.quantity_agg || null;
                if ('total_assess_usd_agg' in item) entry.TOTAL_ASSESS_USD_AGG = item.total_assess_usd_agg || null;
                if ('unit_price_usd_agg' in item) entry.UNIT_PRICE_USD_AGG = item.unit_price_usd_agg || null;
                if ('total_duty_paid_agg' in item) entry.TOTAL_DUTY_PAID_AGG = item.total_duty_paid_agg || null;
                if ('commercial_quantity' in item) entry.COMMERCIAL_QUANTITY = item.commercial_quantity || null;
                if ('commercial_quantity_agg' in item) entry.COMMERCIAL_QUANTITY_AGG = item.commercial_quantity_agg || null;
                if ('custom' in item) entry.CUSTOM = item.custom || null;
                if ('gross_weight' in item) entry.GROSS_WEIGHT = item.gross_weight || null;
                if ('gross_weight_agg' in item) entry.GROSS_WEIGHT_AGG = item.gross_weight_agg || null;
                if ('index' in item) entry.index = item.index ;
                if ("" in item) entry[""] = "";
                return entry as ImportData;
              });
              
              const jsonData: ImportData[] = [];
              extractedValues.forEach(entry => {
                if (Object.keys(entry).length > 0) {
                  jsonData.push(entry);
                }
              });         
              jsonString = JSON.stringify(jsonData);   
              requestBody = {
                name: jsonString,
                columnProperties:JSON.stringify(columnProperties),
                pagination: JSON.stringify({"startpage":startrowgroup,"endrow":endRow})
              };   
              console.log(requestBody) 
            }
            else{
                console.log("Error")
            }
            const downloadlink = `https://powerbidownload-test-duplicate.azurewebsites.net`;
            fetch(downloadlink,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                  },
                body: JSON.stringify(requestBody)
            }).then(response => response.text())
            .then(result => {
                this.api.hideOverlay();
                const url = `https://powerbidownload-test-duplicate.azurewebsites.net${result}`
                this.host.launchUrl(url)})
            .catch(error => console.log('error', error));
            }
        } else {
            this.api.setGridOption("columnDefs",columnDefs);
            this.api.setGridOption("rowData",rowData);
            this.api.sizeColumnsToFit();
        }
    }

}