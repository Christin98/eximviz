    /*currency formatter in visuals */
    export const currencyFormatter = (params) => {
        return '$' + formatNumber(params.value);
        }

    /* Number formatter -----> Specifically designed for the the values that doesn't have any currency values*/
    export const numberFormatter = (params) => { 
    return '' + formatNumber(params.value)
    }

    /*String formatter */
    export const stringFormatter = (params) => { 
    return formatString(params.value)
    }
     
    // Percentage formatter */
    export const percentageFomratter = (params) =>{
        return formatpercentage(params.value);
    }
    // format string if the value is not present 
    export const formatString = (string) => {
        if (string === undefined || string === null || string === "") {
            return "NULL"
        }

        return string
    }

    // format number according to the specified case
    export const formatNumber = (number) => { 
        console.log(number)
        if (number === undefined || number === null) {
            return 0;
        }
        // Add commas and round to 2 decimal places
        return Number(number).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
    export const formatpercentage = (number) =>{
          let percentage = number.toFixed(4)+ "%" ;
          return percentage;
    }

