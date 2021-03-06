﻿var custom_bounds = new L.LatLngBounds(
    new L.LatLng(21.9, 113.12),
    new L.LatLng(22.000000, 113.3));

var mymap = L.map('map-col', { zoomControl: false}).fitBounds(custom_bounds);
var factory_layer;  // geojson layer containing all the factories

$(document).ready(function () {
//    mymap.crs = L.CRS.EPSG4326;
    // http://stackoverflow.com/questions/22926512/customize-zoom-in-out-button-in-leaflet-js
    // http://leafletjs.com/reference.html#control
    L.control.zoom({
        zoomInTitle: '放大',
        zoomOutTitle: '缩小',
        position:'topright'
    }).addTo(mymap);

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mymap);

    // add weather images as tilelayer
    var options = {
        minZoom: 0,
        maxZoom: 10,
        opacity: 0.5,
        attribution: '',
        format: 'png',
        tms: true    // for MapTiler generated, set to false;
    };

//    var data = {
//	'type' : 'FeatureCollection',
//	'features' : [{"type": "Feature",
//	                "id": 7,
//	                "geometry": {
//	                    "coordinates": [[[113.18285500925758, 21.97158131878827], [113.17912522042961, 21.971939952329425], [113.17919694713783, 21.964336921256997], [113.18271155584114, 21.96440864796523], [113.18285500925758, 21.97158131878827]]],
//	                    "type": "Polygon"
//	                },
//	                "properties": {"name": "powerplant"}
//	               },
//	               {"type": "Feature", "id": 8
//	               , "geometry": {"coordinates": [[[113.20939389130285, 21.983918312603915], [113.20473165526788, 21.987863281556592], [113.2022212204798, 21.985137666643833], [113.20494683539256, 21.982555505147538], [113.2073855434724, 21.98169478464877], [113.20939389130285, 21.983918312603915]]], "type": "Polygon"}, "properties": {"name": "BP factory"}
//	               },
//	               {"type": "Feature", "id": 9, "geometry": {"coordinates": [[[113.22287851245018, 21.96648872250391], [113.23040981681439, 21.959387778389097], [113.23672176713866, 21.95881396472325], [113.23887356838557, 21.965341095172224], [113.23550241309874, 21.97029023804013], [113.22589103419585, 21.96921433741667], [113.22287851245018, 21.96648872250391]]], "type": "Polygon"}, "properties": {"name": "wastetreatment"}}
//	              ]
//    };
//    L.geoJSON(data).addTo(mymap);
    $("#btn_full_view").on('click', function () {
        changeLayout(true);
        mymap.invalidateSize();
//        setTimeout(function() {mymap.invalidateSize()}, 400); // doesn't seem to do anything
    });

    $("#btn_scenario_compare").on('click', function () {
        show_scenario_compare();
        mymap.invalidateSize();

        if ($("div#scenario_compare-col").hasClass("col-md-12")) {
            // get the difference after a change of capacity or add a new process to factory
            $.getJSON(url_get_whole_area_diff)
            .done(function (data) {
                console.log("data received");
                add_scenario_comparison_to_table(data);
                //for (var property in data) {
                //    if (data.hasOwnProperty(property)) {
                //        row_data = data[property]
                //        origin = row_data[0];
                //        current = row_data[1];
                //        diff = row_data[2];
                //        console.log(property, origin, current, diff);
                //    }
                //}
            })
            .fail(function (status, err) {
                console.log("Error: Failed to get scenario comparison data.");
            });
        }
    });

    /*  \brief display the scenario comparison results in the table
     */
    function add_scenario_comparison_to_table(data) {
        var $table_body = $("#scenario_compare-col > table > tbody");
        // clear table contents
        $table_body.find("tr").remove();
        for (var property in data) {
            if (data.hasOwnProperty(property)) {
                row_data = data[property]
                origin = row_data[0];
                current = row_data[1];
                diff = row_data[2];
                var desc = "";
                if (origin < 0 && diff < 0)
                    desc = "more required";
                if (origin < 0 && diff > 0)
                    desc = "less required";
                if (origin > 0 && diff < 0)
                    desc = "less produced";
                if (origin > 0 && diff > 0)
                    desc = "more produced";

                var aRow = $table_body.get(0).appendChild(document.createElement('tr'));
                aRow.appendChild($('<td>' + property + '</td>').get(0));
                aRow.appendChild($('<td>' + origin + '</td>').get(0));
                aRow.appendChild($('<td>' + current + '</td>').get(0));
                aRow.appendChild($('<td>' + diff + '</td>').get(0));
                aRow.appendChild($('<td>' + desc + '</td>').get(0));
            }
        }
    }

    /* \brief display the name of the product, an input field
    */
    function add_label_and_textfield(div, label_name, chemical_id) {
        var $new_row = $('<div class="row"></div>');
        var label = '<label class="col-sm-2" chemical_id="' + chemical_id + '">产量(吨):</label>';
        var check_box = '<input type="checkbox" class="col-sm-1" name="desired_chemical_id" value=' + chemical_id + '>' + label_name
        var textfield = '<input type="number" class="col-sm-3" value=100000>';
        var ref_chem = '<input type="radio" class="col-sm-1" name="ref_chem" value=' +chemical_id + '>';
        $new_row.append(ref_chem);
        $new_row.append(label);
        $new_row.append(textfield);
        $new_row.append(check_box);
        div.append($new_row);
    }

    /*  \brief insert all the process id and names into a drop-down box */
    function display_all_reactions() {
        var $select = $("#all_processes_info .panel-heading > select");
        //    $select.empty();
        $.each(CHEMICAL_PROCESS.get_all_chemical_processes(), function (rf_id, rf_detail) {
            $markup = $("<option value=" + +rf_id + "></option>").text(rf_detail.rf_name);
            $markup.attr("product_ids", rf_detail.product_ids);
            //var markup = '<option value="' + +rf_id + '">' + process_detail.rf_name + '</option>';
            $select.append($markup);
        });
        // todo (future request): draw a chart to show the material input and the products!
    };

    $("#all_processes_info .panel-heading > select").on('change', function (e) {
        $("#info_add_process").text("");
        var $div = $("#process_product_name_quantity");
        // remove all the products info of previous process
        $div.children().remove();
        var product_ids = $("option:selected", this).attr("product_ids").split(',');
        for (var i = 0; i < product_ids.length; ++i) {
            // add the chemical_name and a textarea
            chem_name = CHEMICALS.get_name(product_ids[i]);
            add_label_and_textfield($div, chem_name, product_ids[i]);
        }
        // select the first radio button by default
        $div.find("input:checkbox").prop("checked", true);
        // set the first as reference
        $div.find("input:radio:first").prop("checked", true);
    });

    /* \brief btn_add_process_to_factory onclick event: which send the request to server: adding the process into the factory, and
          get response back
    */
    $("#btn_add_process_to_factory").on('click', function (e) {
        // get the process id
        var rf_id = $("#all_processes_info .panel-heading > select").val();
        if (rf_id == null) {
            $("#info_add_process").text('请选择一项工艺');
            return;
        }
        if (g_factory_id == null) {
            $("#info_add_process").text('请点击地图选择企业');
            return;
        }

        var request_content = { products: {}};
        // loop through each row with label and input, if a process has more than 1 products, specify the reference product,
        // which is used as the basis quantity
        $("#process_product_name_quantity").children('div').each(function () {
            var volume = $(this).children('input[type="number"]').val();
            // only if the radio button is selected, then we consider this as desired chemical, the other output will be
            // calculated according to the quantity of the quantity of the desired chemcial
            var ref_chemical_id = $(this).children('input:radio:checked').val();
            if (ref_chemical_id) {
                request_content.ref_chemical_id = +ref_chemical_id;
                request_content.ref_chemical_quantity = +volume;
            }
            else {
                var chemical_id = $(this).children('input:checkbox:checked').val();
                request_content.products[chemical_id] = +volume
            }
        });

        // post the data to the server!
        // add this reaction_formula into factory and the quantity
        // post the data to server
        $.ajax({
            type: "POST",
            url: url_insert_rf_to_factory + rf_id + "/" + g_factory_id,
            data: JSON.stringify(request_content),
            dataType: 'json',
            contentType: 'application/json; charset=utf-8'
        })
        .done(function (data) {
            if (data) {
                if (data.hasOwnProperty('info')) {
                    $("#info_add_process").text(data.info);
                    return;
                }
                else if (data.hasOwnProperty('error')) {
                    $("#info_add_process").text(data.error);
                    return;
                }
                else
                    $("#info_add_process").text("");
                // display
                // show value of the factory
                display_factory_processes_info(g_factory_id, data);
                //OVERVIEW.show_area_total_revenue();
            }
        })
        .fail(function (err) {
            console.log("Error: failed to add process to factory ", factory_id);
        })
    });

    load_geometries(mymap);
    // load all chemical information
    CHEMICALS.load_all_chemicals(null);
    // load all reaction_formula information
    CHEMICAL_PROCESS.load_all_reactions(display_all_reactions);

    // todo: load the analysis result
    //loadCEAnalysis();

    // todo: whole area revenue
    //OVERVIEW.show_area_total_revenue();
});

//! query the database to get the factories, buildings, rails, roads. And display them in the map
function load_geometries(mymap) {
    // get the GeoJSON from the database
    $.getJSON(url_get_factory)
    .done(function (data) {
        factory_layer = L.geoJSON(data, {
            onEachFeature: on_each_feature
        }).addTo(mymap);
//        mymap.addLayer(factory_layer);

//        markFactoryColor(1);
    })
    .fail(function (status, err) {
        console.log("Error: Failed to load factories from DB.");
    });
}

// for each factory polygon, get its products
function on_each_feature(feature, layer) {
    // show the clicked feature name
    if (feature.properties) {
        layer.bindPopup(feature.id + ":" + feature.properties.name);
    }

    layer.on('click', function(e) {
        changeLayout(false);
        mymap.invalidateSize();
        // bind the feature to its products
        factory_id = this.feature.id;
        $.getJSON(url_get_factory_products + factory_id)
        .done(function (data) {
            if (data.length > 0)
                console.log(data[0].rf_name)
            display_factory_processes_info(factory_id, data);
        })
        .fail (function (status, err) {
            console.log("Error: failed to load products from factory", feature.id);
        })
        resetFactoryColor();
    });
}

//! handler of on the polygon click
function onFeatureClick(feature) {
    alert('click event: ' + feature.id)
}

function markFactoryColor(factory_id) {
    factory_layer.eachLayer(function (layer) {
        if (layer.feature.id == factory_id) {
            layer.setStyle({fillColor:'#fff460', fillOpacity:1.0});
        };
    });
}

function resetFactoryColor(factory_id) {
    factory_layer.eachLayer(function (layer) {
        if (layer.feature.id == factory_id) {
            factory_layer.resetStyle(layer);
            return;
        };
    });
}

function resetFactoryColor() {
    factory_layer.eachLayer(function (layer) {
        factory_layer.resetStyle(layer);
    });
}