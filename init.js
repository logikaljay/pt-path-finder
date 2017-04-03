const center = '7 London St, Eltham 4322'
const origin = '7 London St, Eltham 4322'
const destination = '74 Clifford Rd, Eltham 4322'
const travelMode = 'WALKING'
var map = null
var routeData = []
var tsp = null
var directionsDisplay = null
var stepDisplay = null
var originalDirections = null
var markerArray = []

function init() {

    var directionsService = new google.maps.DirectionsService
    
    geoCodeForAddress('7 london st, eltham 4322', (err, center) => {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 16,
            center
        })

        tsp = new BpTspSolver(map, document.getElementById('warnings-panel'));

        directionsDisplay = new google.maps.DirectionsRenderer({ map, suppressMarkers: true })
        stepDisplay = new google.maps.InfoWindow
        calculateAndDisplayRoute({ directionsDisplay, directionsService, stepDisplay, map })

        const onChangeHandler = () => {
          calculateAndDisplayRoute({ directionsDisplay, directionsService, stepDisplay, map })
        }
    })
}

const calculateAndDisplayRoute = (params) => {
    const {directionsDisplay, directionsService, stepDisplay, map} = params

    // remove all existing markers
    markerArray.forEach(marker => marker.setMap(null))
    markerArray = [];

    // use the start and end locations to create a DirectionsRequest using WALKING
    directionsService.route({
        origin,
        destination,
        travelMode
    }, (res, status) => {
        if (status === 'OK') {
            document.getElementById('warnings-panel').innerHTML = `<b>${res.routes[0].warnings}</b>`
            directionsDisplay.setDirections(res)
            originalDirections = res
            showSteps(res)
        }
        else {
            document.getElementById('warnings-panel').innerHTML = `<b>Directions request failed due to ${status}`
        }
    })
}


const showSteps = (directionResult) => {

    if (directionResult === originalDirections) {
        const { metres, seconds } = computeRouteDistance(directionResult)
        document.getElementById('routeHelp').innerHTML = `
            <b>Original Distance: ${metres}m, walking time: ${(seconds/60).toFixed(2)} mins
        `
    }
    else {
        const { metres: originalmetres, seconds: originalSeconds } = computeRouteDistance(originalDirections)
        const { metres: newMetres, seconds: newSeconds } = computeRouteDistance(directionResult)
        document.getElementById('routeHelp').innerHTML = `
            <b>Original Distance: ${originalmetres}m, walking time: ${(originalSeconds/60).toFixed(2)} mins</b><br/>
            <b>New distance: ${newMetres}m, walking time: ${(newSeconds/60).toFixed(2)} mins</b>
        `
    }

    // place a marker for each step
    var route = directionResult.routes[0].legs[0]
    var steps = directionResult.routes[0].legs.reduce((prev, leg) => prev.concat(leg.steps), [])

    for (var i in steps) {
        var step = steps[i]
        var marker = markerArray[i] = markerArray[i] || new google.maps.Marker
        marker.setMap(map)
        marker.setPosition(step.start_location)

        addDirections(marker, step)
    }
}

const addDirections = (marker, step) => {
    google.maps.event.addListener(marker, 'click', function () {
        stepDisplay.setContent(step.instructions)
        stepDisplay.open(map, marker)
    })
}

const computeRouteDistance = (directionResult) => {

    var totalDistance = 0
    var totalTime = 0
    var route = directionResult.routes[0]
    for (var leg of route.legs) {
        totalDistance += leg.distance.value
        totalTime += leg.duration.value

        for (var step of leg.steps) {
            routeData.push([
                step.start_location.lat(),
                step.start_location.lng()
            ])
        }

        routeData.push([
            leg.steps[leg.steps.length - 1].end_location.lat(),
            leg.steps[leg.steps.length - 1].end_location.lng(),
        ])
    }

    return { 
        metres: totalDistance,
        seconds: totalTime
    }
}

const geoCodeForAddress = (address, cb) => {
    var geocoder = new google.maps.Geocoder()

    geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
            cb(null, results[0].geometry.location)
        }
        else {
            // Google couldn't geocode this request. Handle appropriately.
        }
    });
}