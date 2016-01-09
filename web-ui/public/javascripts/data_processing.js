var chart; // global
var charts = [];

var config = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: "Temperature",
            data: [],
            fill: false,
            //borderDash: [5, 5],
            borderColor: "rgba(200,0,0,1)",
            backgroundColor: "rgba(200,0,0,1)",
            pointBorderColor: "rgba(200,0,0,1)",
            pointBackgroundColor: "rgba(200,0,0,1)",
            pointBorderWidth: 1,
            pointHoverRadius: 7,
            yAxisID: "y-axis-temp1",
        }, {
            label: "Light intensity",
            data: [],
            fill: false,
            //borderDash: [5, 5],
            borderColor: "rgba(0,0,200,1)",
            backgroundColor: "rgba(0,0,200,1)",
            pointBorderColor: "rgba(0,0,200,1)",
            pointBackgroundColor: "rgba(0,0,200,1)",
            pointBorderWidth: 1,
            pointHoverRadius: 7,
            yAxisID: "y-axis-light1",
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
                id: "y-axis-temp1",
                display: true,
                position: "left",
                type: "linear",
                scaleLabel: {
                    display: true,
                    labelString: 'degrees C'
                }
            }, {
                id: "y-axis-light1",
                display: true,
                position: "right",
                type: "linear",
                scaleLabel: {
                    display: true,
                    labelString: 'lux'
                },
                gridLines: {
                    drawOnChartArea: false, // only want the grid lines for one axis
                },
                ticks: {
                    beginAtZero: true,
                    //suggestedMin: 0,
                    //suggestedMax: 100,
                }
            }]
        }
    }
};

/**
 * Request data from the server, add it to the graph and text part,
 * then set a timeout to request again
 */
function requestData() {
    // we'll request data from server after these many milliseconds
    var DATA_REQ_INTERVAL = 5000;
    $.ajax({
        url: 'get_sensor_data',
        success: function(sensor_data_items) {
            // set values for textual sensor data representation
            updateTextData(sensor_data_items);
            
            // create/update HTML elements for charts
            updateChartElements(sensor_data_items);
            
            // create/update chart objects
            updateCharts(sensor_data_items);
            
            // update charts
            updateChartData(sensor_data_items);

            // call it again with an interval
            setTimeout(requestData, DATA_REQ_INTERVAL);
        },
        cache: false
    });
}

/**
 * This function updates text part of the data display
 */
function updateTextData(sensor_data_items) {
    // clean up
    $('#sensor_data_items').empty();

    // outer loop for modules
    for (var ii=0; ii < sensor_data_items['data'].length; ii++) {
        $('<li id=sensor_module_' + ii + '/>').text(sensor_data_items['data'][ii]['moduleName']).appendTo('#sensor_data_items');
        $('#sensor_module_' + ii).append('<ul id=sensor_module_' + ii + '_data></ul>');
        // inner loop for sensors attached to a module
        for (var jj=0; jj < sensor_data_items['data'][ii]['sensors'].length; jj++) {
            $('<li/>').text(sensor_data_items['data'][ii]['sensors'][jj]['name'] +
                            ": " +
                            sensor_data_items['data'][ii]['sensors'][jj]['value'] +
                            " " +
                            sensor_data_items['data'][ii]['sensors'][jj]['units']
            ).appendTo('#sensor_module_' + ii + '_data');
        }
    }
}

/**
 * This function creates/updates necessary HTML elements to hold our charts
 */
function updateChartElements(sensor_data_items) {
    $('#sensor_data_charts').empty();
    // outer loop for modules
    for (var ii=0; ii < sensor_data_items['data'].length; ii++) {
        // add module-level div
        var moduleLevelEltId = sensor_data_items['data'][ii]['moduleName'].replace(/:/g, '');
        $('<div/>').attr('id', moduleLevelEltId)
                   .appendTo('#sensor_data_charts');
        // add module-level title
        $('<h3/>').text(sensor_data_items['data'][ii]['moduleName'] + ' module charts')
                  .appendTo('[id="' + moduleLevelEltId + '"]');
        // inner loop for sensors attached to a module
        for (var jj=0; jj < sensor_data_items['data'][ii]['sensors'].length; jj++) {
            // add single sensor-level div
            var sensorLevelEltId = (moduleLevelEltId +
                                    "-" +
                                    sensor_data_items['data'][ii]['sensors'][jj]['name']).replace(/ /g, '');
            $('<div/>').attr('id', sensorLevelEltId)
                       .appendTo('[id="' + moduleLevelEltId + '"]');
            // add sensor-level title
            $('<h4/>').text(sensor_data_items['data'][ii]['sensors'][jj]['name'] + ' sensor chart')
                      .appendTo('[id="' + sensorLevelEltId + '"]');
            // add single sensor-level legend container
            var sensorLevelLegendEltId = (moduleLevelEltId +
                                          "-" +
                                          sensor_data_items['data'][ii]['sensors'][jj]['name'] +
                                          "-legend").replace(/ /g, '');
            $('<div/>').attr('id', sensorLevelLegendEltId)
                       .appendTo('[id="' + sensorLevelEltId + '"]');
            // add single sensor-level chart container
            var sensorLevelCanvasEltId = (moduleLevelEltId +
                                          "-" +
                                          sensor_data_items['data'][ii]['sensors'][jj]['name'] +
                                          "-canvas").replace(/ /g, '');
            $('<canvas/>').attr({ id: sensorLevelCanvasEltId, style: 'width:100%;height:300px' })
                          .appendTo('[id="' + sensorLevelEltId + '"]');
        }
    }
}

/**
 * This function updates chart part of the data display
 */
function updateChartData(sensor_data_items) {
    // we'll display these many points - each point is taken once per second
    var NUMBER_OF_POINTS_TO_DISPLAY = 15;

    var temp_series = config.data.datasets[0],
        temp_shift = temp_series.data.length > NUMBER_OF_POINTS_TO_DISPLAY;

    var light_series = config.data.datasets[1],
        light_shift = light_series.data.length > NUMBER_OF_POINTS_TO_DISPLAY;

    var labels_series = config.data.labels,
        labels_shift = labels_series.length > NUMBER_OF_POINTS_TO_DISPLAY;

    // add the Temperature point with a timestamp
    time = new Date();
    if (temp_shift) {
        temp_series.data.shift()
    }
    temp_series.data.push(sensor_data_items['data'][0]['sensors'][0]['value']);

    // add the Light intensity point with the same timestamp
    if (light_shift) {
        light_series.data.shift()
    }
    light_series.data.push(sensor_data_items['data'][0]['sensors'][1]['value']);

    // add timestamp to Labels
    if (labels_shift) {
        labels_series.shift()
    }
    labels_series.push(time.toLocaleTimeString());

    // update chart
    chart.update()
}

function updateCharts(sensor_data_items) {

}

/**
 * This function updates chart legend
 */
function updateLegend() {
    $legendContainer = $('#legend_container');
    $legendContainer.empty();
    $legendContainer.append(chart.generateLegend());
}

$(document).ready(function() {
    var ctx = document.getElementById("chart_canvas").getContext("2d");
    chart = new Chart(ctx, config);

    updateLegend();
    requestData();
});
