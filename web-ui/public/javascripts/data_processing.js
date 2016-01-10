var charts = [];

/**
 * Generates Chart.js chart config and options object given a sensor data entry
 */
function generateChartConfig(sensorDataItem) {
    var config = {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: sensorDataItem['name'],
                data: [],
                fill: false,
                //borderDash: [5, 5],
                borderColor: "rgba(0,0,200,1)",
                backgroundColor: "rgba(0,0,200,1)",
                pointBorderColor: "rgba(0,0,200,1)",
                pointBackgroundColor: "rgba(0,0,200,1)",
                pointBorderWidth: 1,
                pointHoverRadius: 7,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            tooltips: {
                mode: 'label',
                backgroundColor: "rgba(0,0,0,0.3)",
            },
            hover: {
                mode: 'label',
            },
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        show: true,
                        labelString: 'Time'
                    }
                }],
                yAxes: [{
                    display: true,
                    position: "left",
                    type: "linear",
                    scaleLabel: {
                        display: true,
                        labelString: sensorDataItem['units']
                    }
                }]
            }
        }
    };

    return config;
}

/**
 * Main AJAX function, request sensor data from the server, updates text and charts,
 * then sets a timeout to request again
 */
function requestData() {
    // we'll request data from server after these many milliseconds
    var DATA_REQ_INTERVAL = 5000;
    $.ajax({
        url: 'get_sensor_data',
        success: function(sensorDataItems) {
            // set values for textual sensor data representation
            updateTextData(sensorDataItems);

            // create/update HTML elements for charts
            updateChartElements(sensorDataItems);

            // call it again with an interval
            setTimeout(requestData, DATA_REQ_INTERVAL);
        },
        cache: false
    });
}

/**
 * This function updates text part of the data display
 */
function updateTextData(sensorDataItems) {
    // clean up
    $('#sensor_data_items').empty();

    // outer loop for modules
    for (var ii=0; ii < sensorDataItems['data'].length; ii++) {
        // line for a sensor module
        $('<li id=sensor_module_' + ii + '/>').text(sensorDataItems['data'][ii]['moduleName'])
                                              .appendTo('#sensor_data_items');
        // list for sensor data items themselves
        $('#sensor_module_' + ii).append('<ul id=sensor_module_' + ii + '_data></ul>');
        // inner loop for sensors attached to a module
        for (var jj=0; jj < sensorDataItems['data'][ii]['sensors'].length; jj++) {
            $('<li/>').text(sensorDataItems['data'][ii]['sensors'][jj]['name'] +
                            ": " +
                            sensorDataItems['data'][ii]['sensors'][jj]['value'] +
                            " " +
                            sensorDataItems['data'][ii]['sensors'][jj]['units'])
                      .appendTo('#sensor_module_' + ii + '_data');
        }
    }
}

/**
 * This function creates/updates necessary HTML elements to hold our charts
 * and Chart.js objects for charts themselves.
 * Precondition: module and sensor names contain only alphanumeric symbols,
 * exceptions are colon ':' and space ' ', which we remove.
 */
function updateChartElements(sensorDataItems) {
    // checking the number of sensor modules vs. number of charts, redraw if not equal
    // TODO: what if an existing module goes out and one new goes in (i.e. the number is the same)?
    if (sensorDataItems['data'].length != $('[id$="-module"]').length) {
        // number of modules has changed
        console.log("Number of modules has changed!");

        // cleanup everything
        // first HTML elements...
        $('#sensor_data_charts').empty();
        // ...then chart-related objects
        for (var chartItem in charts) {
            if (charts.hasOwnProperty(chartItem)) {
                charts[chartItem].chart.destroy();
                delete charts[chartItem];
            }
        }

        // create HTML elements structure
        // outer loop for modules
        for (var ii=0; ii < sensorDataItems['data'].length; ii++) {
            // add module-level div
            var moduleName = sensorDataItems['data'][ii]['moduleName'];
            var moduleLevelDivEltId = (moduleName.replace(/:| /g, '') + '-module');
            $('<div/>').attr('id', moduleLevelDivEltId)
                       .appendTo('#sensor_data_charts');
            // add module-level title
            $('<h3/>').text(moduleName + ' module charts')
                      .appendTo('[id="' + moduleLevelDivEltId + '"]');
            // inner loop for sensors attached to a module
            for (var jj=0; jj < sensorDataItems['data'][ii]['sensors'].length; jj++) {
                // add single sensor-level div
                var sensorLevelDivEltId = (moduleLevelDivEltId +
                                           '-' +
                                           sensorDataItems['data'][ii]['sensors'][jj]['name'] +
                                           '-sensor').replace(/ /g, '');
                $('<div/>').attr('id', sensorLevelDivEltId)
                           .appendTo('[id="' + moduleLevelDivEltId + '"]');
                // add sensor-level title
                $('<h4/>').text(sensorDataItems['data'][ii]['sensors'][jj]['name'] + ' sensor chart')
                          .appendTo('[id="' + sensorLevelDivEltId + '"]');
                // add single sensor-level chart container
                var sensorLevelChartDivEltId = (moduleLevelDivEltId +
                                                '-' +
                                                sensorDataItems['data'][ii]['sensors'][jj]['name'] +
                                                '-chart').replace(/ /g, '');
                $('<div/>').attr({ id: sensorLevelChartDivEltId, style: 'width:100%;height:150px' })
                           .appendTo('[id="' + sensorLevelDivEltId + '"]');
                // add single sensor-level chart canvas
                var sensorLevelChartCanvasEltId = (moduleLevelDivEltId +
                                                   '-' +
                                                   sensorDataItems['data'][ii]['sensors'][jj]['name'] +
                                                   '-canvas').replace(/ /g, '');
                $('<canvas/>').attr('id', sensorLevelChartCanvasEltId)
                              .appendTo('[id="' + sensorLevelChartDivEltId + '"]');

                // generate chart objects
                var config = generateChartConfig(sensorDataItems['data'][ii]['sensors'][jj]);
                var ctx = $('[id="' + sensorLevelChartCanvasEltId + '"]').get(0).getContext("2d");;
                var chart = new Chart(ctx, config);
                // add objects to a global holder, to use elsewhere
                charts[sensorLevelDivEltId] = { config: config, ctx: ctx, chart: chart };
            }
        }
    } else {
        // number of modules hasn't changed - just proceed with chart dataset updates.
        // TODO: add logic for checking number of sensors per module.
        // outer loop for modules
        for (var ii=0; ii < sensorDataItems['data'].length; ii++) {
            // inner loop for sensors attached to a module
            for (var jj=0; jj < sensorDataItems['data'][ii]['sensors'].length; jj++) {
                // construct the charts array key the same way we do in the creation part
                // TODO: make this a common code (function?)
                var moduleName = sensorDataItems['data'][ii]['moduleName'];
                var moduleLevelDivEltId = (moduleName.replace(/:| /g, '') + '-module');
                var sensorLevelDivEltId = (moduleLevelDivEltId +
                                           '-' +
                                           sensorDataItems['data'][ii]['sensors'][jj]['name'] +
                                           '-sensor').replace(/ /g, '');
                updateChartData(charts[sensorLevelDivEltId]['chart'],
                                charts[sensorLevelDivEltId]['config'],
                                sensorDataItems['data'][ii]['sensors'][jj]);
            }
        }
    }
}

/**
 * This function updates chart part of the data display
 */
function updateChartData(chart, chartConfig, sensorDataItem) {
    // we'll display these many points
    var NUMBER_OF_POINTS_TO_DISPLAY = 15;

    var sensorDataSeries = chartConfig.data.datasets[0],
        sensorDataShift = sensorDataSeries.data.length > NUMBER_OF_POINTS_TO_DISPLAY;

    var labelSeries = chartConfig.data.labels,
        labelShift = labelSeries.length > NUMBER_OF_POINTS_TO_DISPLAY;

    // add a sensor data point with a timestamp
    var time = new Date();
    if (sensorDataShift) {
        sensorDataSeries.data.shift()
    }
    sensorDataSeries.data.push(sensorDataItem['value']);

    // add timestamp to Labels
    if (labelShift) {
        labelSeries.shift()
    }
    labelSeries.push(time.toLocaleTimeString());

    // update chart
    chart.update();
}

/**
* Triggers our utility functions after the page is ready
*/
$(document).ready(function() {
    requestData();
});
