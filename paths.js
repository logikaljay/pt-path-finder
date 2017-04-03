var paths = {
    'George St': {
        points: [
            [-39.424234, 174.296317],
            [-39.424226, 174.295212],
            [-39.424209, 174.294976],
            [-39.423977, 174.293356],
            [-39.423948, 174.291806]
        ]
    },

    'Pinny Dr': {
        points: [
            [-39.429117, 174.286508],
            [-39.428637, 174.286485],
            [-39.428231, 174.285911]
        ]
    },

    'Burke St': {
        points: [
            [-39.429518, 174.295869],
            [-39.429549, 174.295240],
            [-39.429551, 174.294253]
        ]
    },

    'Stanners St': {
        points: [
            [-39.425453, 174.296160],
            [-39.427440, 174.297889],
            [-39.429056, 174.297534],
            [-39.430063, 174.297137],
            [-39.430063, 174.297137] 
        ]
    }
}

var pathDirections = null
const addPathsToMap = () => {
    if ( ! map) {
        document.getElementById('warnings-panel').innerHTML = `<b>Map not initialised - something went wrong</b>`
    }

    var controls = document.getElementById('controls')

    controls.innerHTML += `
        <select id="path" onchange="applyPath(this.value)">
            <option value="">Select path to use</option>
            ${Object.keys(paths).map((key) => `<option value="${key}">${key}</option>`)}
        </select>
    `

    for (var key in paths) {
        var path = paths[key].points.map(point => { return { lat: point[0], lng: point[1] }})

        var polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: 'rgb(236, 108, 191)',
            strokeOpacity: 0.5,
            strokeWeight: 4
        })

        paths[key].polyline = polyline
        polyline.setMap(map)

        console.log({ [key]: distanceOfPath(paths[key]) })
    }
}

const applyPath = (value) => {
    // hide all current polylines
    if (typeof value === 'undefined') {
        value = document.getElementById('path').value
        console.log(value)
    }

    if (value === '') {
        Object.keys(paths).forEach(key => paths[key].polyline.setMap(map))
    }
    else {
        // Object.keys(paths).forEach(key => paths[key].polyline.setMap(null))
        var path = paths[value]
        
        // calculate distances between start and entire path
        var first = routeData[0]
        var last = routeData[routeData.length - 1]
        var start = [
            new google.maps.LatLng(first[0], first[1]), 
            new google.maps.LatLng(last[0], last[1])
        ]
        var end = path.points.map(point => new google.maps.LatLng(point[0], point[1]))
        var service = new google.maps.DistanceMatrixService
        service.getDistanceMatrix({
            origins: start,
            destinations: end,
            travelMode,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: true,
            avoidTolls: true
        }, (res, status) => {
            if (status !== 'OK') {
                document.getElementById('warning-panel').innerHTML = `<b>Issue getting distance matrix: ${status}`
            }
            else {
                
                var origin = res.originAddresses[0]
                var destination = res.originAddresses[1]
                var pathPoints = res.destinationAddresses

                var originResults = res.rows[0].elements.reduce((prev, current) => prev.concat(current.distance.value), [])
                var destinationResults = res.rows[1].elements.reduce((prev, current) => prev.concat(current.distance.value), [])

                var startPathIndex = originResults.indexOf(Math.min(...originResults))
                var endPathIndex = destinationResults.indexOf(Math.min(...destinationResults))
                
                var newPath = path.points
                newPath.splice(0, startPathIndex)
                newPath.splice(newPath.length - endPathIndex)
                newPath.unshift(first)
                newPath.push(last)

                directionsDisplay.setMap(null)
                directionsDisplay = new google.maps.DirectionsRenderer({ map, suppressMarkers: true })

                // start over
                tsp.startOver()
                tsp.setAvoidHighways(true)
                tsp.setTravelMode(google.maps.DirectionsTravelMode[travelMode])
                newPath.forEach(point => tsp.addWaypoint(new google.maps.LatLng(point[0], point[1])))
                tsp.solveAtoZ(() => {
                    pathDirections = tsp.getGDirections()

                    directionsDisplay.setDirections(pathDirections)
                    showSteps(pathDirections)
                })

            }
        })
    }
}

const acceptableThreshold = (original, path) => {
    // get distance and time from original directions
    var originalMetrics = computeRouteDistance(originalDirections)
    var pathMetrics = computeRouteDistance(pathDirections)
    
    // get use selected threshold
    var {metres, seconds} = getThreshold()

    if (metres > 0) {
        return pathMetrics.metres - metres <= originalMetrics.metres
    }
    else {
        return pathMetrics.seconds - seconds <= originalMetrics.seconds
    }
}

const getThreshold = () => {
    var metres = 1000
    var seconds = 0

    var value = document.getElementById('threshold').value
    if (value.indexOf('m') > -1) {
        seconds = Number(value) * 60
    }
    else {
        metres = Number(value)
    }

    return {
        metres,
        seconds
    }
}

const distanceOfPath = (path) => {
    var length = 0
    for (var i = 1; i <= path.points.length - 1; i++) {
        var current = path.points[i]
        var previous = path.points[i - 1]
        length += google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(current[0], current[1]),
            new google.maps.LatLng(previous[0], previous[1])
        )
    }

    return length
}