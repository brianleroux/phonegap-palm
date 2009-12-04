/*
 * TODO: there has gotta be a better way to do this.
 * We need Mojo to be loaded before phonegap so that we can override the Position class (and possibly others?)
 * So if mojo is not defined, include it, and then re-run phonegap.js.
 * Hacky I know, since we include phonegap twice, but the load time of phonegap.js, being a local file, is negligible.
 */

if (typeof Mojo == 'undefined') {
	document.write('<script src="/usr/palm/frameworks/mojo/mojo.js" type="text/javascript" x-mojo-version="1" />');
	document.write('<script src="phonegap.js" type="text/javascript" />');
}/**
 * This class contains acceleration information
 * @constructor
 * @param {Number} x The force applied by the device in the x-axis.
 * @param {Number} y The force applied by the device in the y-axis.
 * @param {Number} z The force applied by the device in the z-axis.
 */
function Acceleration(x, y, z) {
	/**
	 * The force applied by the device in the x-axis.
	 */
	this.x = x;
	/**
	 * The force applied by the device in the y-axis.
	 */
	this.y = y;
	/**
	 * The force applied by the device in the z-axis.
	 */
	this.z = z;
	/**
	 * The time that the acceleration was obtained.
	 */
	this.timestamp = new Date().getTime();
}

/**
 * This class specifies the options for requesting acceleration data.
 * @constructor
 */
function AccelerationOptions() {
	/**
	 * The timeout after which if acceleration data cannot be obtained the errorCallback
	 * is called.
	 */
	this.timeout = 10000;
}
/**
 * This class provides access to device accelerometer data.
 * @constructor
 */
function Accelerometer() {
	/**
	 * The last known acceleration.
	 */
	this.lastAcceleration = null;
}

/**
 * Asynchronously aquires the current acceleration.
 * @param {Function} successCallback The function to call when the acceleration
 * data is available
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the acceleration data.
 * @param {AccelerationOptions} options The options for getting the accelerometer data
 * such as timeout.
 */

Accelerometer.prototype.getCurrentAcceleration = function(successCallback, errorCallback, options) {

    var referenceTime = 0;
    if (this.lastAcceleration)
        referenceTime = this.lastAcceleration.timestamp;
    else
        this.start();
 
    var timeout = 20000;
    var interval = 500;
    if (typeof(options) == 'object' && options.interval)
        interval = options.interval;
 
    if (typeof(successCallback) != 'function')
        successCallback = function() {};
    if (typeof(errorCallback) != 'function')
        errorCallback = function() {};
 
    var dis = this;
    var delay = 0;
    var timer = setInterval(function() {
        delay += interval;
 
		//if we have a new acceleration, call success and cancel the timer
        if (typeof(dis.lastAcceleration) == 'object' && dis.lastAcceleration.timestamp > referenceTime) {
            successCallback(dis.lastAcceleration);
            clearInterval(timer);
        } else if (delay >= timeout) { //else if timeout has occured then call error and cancel the timer
            errorCallback();
            clearInterval(timer);
        }
		//else the interval gets called again
    }, interval);
}


/**
 * Asynchronously aquires the acceleration repeatedly at a given interval.
 * @param {Function} successCallback The function to call each time the acceleration
 * data is available
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the acceleration data.
 * @param {AccelerationOptions} options The options for getting the accelerometer data
 * such as timeout.
 */

Accelerometer.prototype.watchAcceleration = function(successCallback, errorCallback, options) {
	this.getCurrentAcceleration(successCallback, errorCallback, options);
	// TODO: add the interval id to a list so we can clear all watches
 	var frequency = (options != undefined)? options.frequency : 10000;
	var that = this;
	return setInterval(function() {
		that.getCurrentAcceleration(successCallback, errorCallback, options);
	}, frequency);
}

/**
 * Clears the specified accelerometer watch.
 * @param {String} watchId The ID of the watch returned from #watchAcceleration.
 */
Accelerometer.prototype.clearWatch = function(watchId) {
	clearInterval(watchId);
}

Accelerometer.prototype.start = function() {
	var that = this;
	Mojo.Event.listen(document, "acceleration", function(event) {
		var accel = new Acceleration(event.accelX, event.accelY, event.accelZ);
		that.lastAcceleration = accel;
	});
}

if (typeof navigator.accelerometer == "undefined") navigator.accelerometer = new Accelerometer();function Device() {
    this.platform = "palm";
    this.version  = null;
    this.name     = null;
    this.uuid     = null;

	if (typeof Mojo != 'undefined')
		this.setUUID();
}

Device.prototype.setUUID = function() {
	//this is the only system property webos provides (may change?)
	var that = this;
	this.service = new Mojo.Service.Request('palm://com.palm.preferences/systemProperties', {
	    method:"Get",
	    parameters:{"key": "com.palm.properties.nduid" },
	    onSuccess: function(result) {
			that.uuid = result["com.palm.properties.nduid"];
		}
    });	
}

if (typeof navigator.device == 'undefined') navigator.device = new Device();/**
 * This class provides generic read and write access to the mobile device file system.
 */
function File() {
	/**
	 * The data of a file.
	 */
	this.data = "";
	/**
	 * The name of the file.
	 */
	this.name = "";
}

/**
 * Reads a file from the mobile device. This function is asyncronous.
 * @param {String} fileName The name (including the path) to the file on the mobile device. 
 * The file name will likely be device dependant.
 * @param {Function} successCallback The function to call when the file is successfully read.
 * @param {Function} errorCallback The function to call when there is an error reading the file from the device.
 */
File.prototype.read = function(fileName, successCallback, errorCallback) {
	//Mojo has no file i/o yet, so we use an xhr. very limited
	var path = fileName;	//incomplete
	Mojo.Log.error(path);
	
	if (typeof successCallback != 'function')
		successCallback = function () {};
	if (typeof errorCallback != 'function')
		errorCallback = function () {};
	
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200 && xhr.responseText != null) {
				this.data = xhr.responseText;
				this.name = path;
				successCallback(this.data);
			} else {
				errorCallback({ name: xhr.status, message: "could not read file: " + path });
			}
		}
	}
	xhr.open("GET", path, true);
	xhr.send();
}

/**
 * Writes a file to the mobile device. 
 * @param {File} file The file to write to the device.
 */
File.prototype.write = function(file) {
	//Palm does not provide file i/o
}

if (typeof navigator.file == "undefined") navigator.file = new File();

/**
 * This class provides access to device GPS data.
 * @constructor
 */
function Geolocation() {
    /**
     * The last known GPS position.
     */
    this.lastPosition = null;
    this.lastError = null;
    this.callbacks = {
        onLocationChanged: [],
        onError:           []
    };
};

/**
 * Asynchronously aquires the current position.
 * @param {Function} successCallback The function to call when the position
 * data is available
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the position data.
 * @param {PositionOptions} options The options for getting the position data
 * such as timeout.
 */
Geolocation.prototype.getCurrentPosition = function(successCallback, errorCallback, options) {
    var referenceTime = 0;
    if (this.lastPosition)
        referenceTime = this.lastPosition.timestamp;
    else
        this.start(options);

    var timeout = 20000;
    var interval = 500;
    if (typeof(options) == 'object' && options.interval)
        interval = options.interval;
		
    if (typeof(successCallback) != 'function')
        successCallback = function() {};
    if (typeof(errorCallback) != 'function')
        errorCallback = function() {};

    var dis = this;
    var delay = 0;
    var timer = setInterval(function() {
        delay += interval;
		
		//if we have a new position, call success and cancel the timer
        if (typeof(dis.lastPosition) == 'object' && dis.lastPosition.timestamp > referenceTime) {
            successCallback(dis.lastPosition);
            clearInterval(timer);
        } else if (delay >= timeout) { //else if timeout has occured then call error and cancel the timer
            errorCallback();
            clearInterval(timer);
        }
		//else the interval gets called again
    }, interval);
};

/**
 * Asynchronously aquires the position repeatedly at a given interval.
 * @param {Function} successCallback The function to call each time the position
 * data is available
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the position data.
 * @param {PositionOptions} options The options for getting the position data
 * such as timeout and the frequency of the watch.
 */
Geolocation.prototype.watchPosition = function(successCallback, errorCallback, options) {
	// Invoke the appropriate callback with a new Position object every time the implementation 
	// determines that the position of the hosting device has changed. 
	
	this.getCurrentPosition(successCallback, errorCallback, options);
	var frequency = 10000;
        if (typeof(options) == 'object' && options.frequency)
            frequency = options.frequency;
	
	var that = this;
	return setInterval(function() {
		that.getCurrentPosition(successCallback, errorCallback, options);
	}, frequency);
};


/**
 * Clears the specified position watch.
 * @param {String} watchId The ID of the watch returned from #watchPosition.
 */
Geolocation.prototype.clearWatch = function(watchId) {
	clearInterval(watchId);
};

Geolocation.prototype.start = function(options) {
	//options.timeout;
	//options.interval;
	
	var that = this;
	
	//location tracking does not support setting a custom interval :P
	this.trackingHandle = new Mojo.Service.Request('palm://com.palm.location', {
		method : 'startTracking',
        parameters: {
			subscribe: true
                },
        onSuccess: function(event) { 
			that.lastPosition = { 
				coords: { latitude: event.latitude, longitude: event.longitude, altitude: event.altitude, speed: event.velocity, heading: event.heading, accuracy: event.horizAccuracy }, 
				timestamp: new Date().getTime() 
			}
		},
        onFailure: function() {}
    });
}

Geolocation.prototype.stop = function() {
	this.trackingHandle.cancel();
}


if (typeof navigator.geolocation == "undefined") navigator.geolocation = new Geolocation();function Network() {
    /**
     * The last known Network status.
     */
	this.lastReachability = null;
};

Network.prototype.isReachable = function(hostName, successCallback, options) {
	this.request = new Mojo.Service.Request('palm://com.palm.connectionmanager', {
	    method: 'getstatus',
	    parameters: {},
	    onSuccess: function(result) { successCallback(result.isInternetConnectionAvailable); },
	    onFailure: function() {}
	});

};

/**
 * This class contains information about any NetworkStatus.
 * @constructor
 */
function NetworkStatus() {
	this.code = null;
	this.message = "";
}

NetworkStatus.NOT_REACHABLE = 0;
NetworkStatus.REACHABLE_VIA_CARRIER_DATA_NETWORK = 1;
NetworkStatus.REACHABLE_VIA_WIFI_NETWORK = 2;

if (typeof navigator.network == "undefined") navigator.network = new Network();function Notification() {
}

Notification.prototype.vibrate = function () {

	//can't seem to control the duration or intensity
	//Mojo.Controller.getAppController().playSoundNotification("vibrate");
	
	//TODO: currently giving error "palm//com.palm.vibrate is not running"
	this.vibhandle = new Mojo.Service.Request("palm://com.palm.vibrate", { 
		method: 'vibrate', 
		parameters: { 
			'period': 0,
			'duration': 75
		},
    	onSuccess: function (response) { },
    	onFailure: function (response) { Mojo.Log.error("failure: " + Object.toJSON(response)); }
	}, true);
}

Notification.prototype.beep = function () {
	this.beephandle = new Mojo.Service.Request('palm://com.palm.audio/systemsounds', {
	    method: "playFeedback",
	    parameters: {
			name: "alert_buzz"
		},
    	onSuccess: function (response) { },
    	onFailure: function (response) { Mojo.Log.error("failure: " + Object.toJSON(response)); }
	}, true);
}

if (typeof navigator.notification == 'undefined') navigator.notification = new Notification();/**
 * This class provides access to the device orientation.
 * @constructor
 */
function Orientation() {
	/**
	 * The current orientation, or null if the orientation hasn't changed yet.
	 */
	this.currentOrientation = null;
	this.started = false;
}

/**
 * Set the current orientation of the phone.  This is called from the device automatically.
 * 
 * When the orientation is changed, the DOMEvent \c orientationChanged is dispatched against
 * the document element.  The event has the property \c orientation which can be used to retrieve
 * the device's current orientation, in addition to the \c Orientation.currentOrientation class property.
 *
 * @param {Number} orientation The orientation to be set
 */
Orientation.prototype.setOrientation = function(orientation) {
    Orientation.currentOrientation = orientation;
    var e = document.createEvent('Events');
    e.initEvent('orientationChanged', 'false', 'false');
    e.orientation = orientation;
    document.dispatchEvent(e);
};

/**
 * Asynchronously aquires the current orientation.
 * @param {Function} successCallback The function to call when the orientation
 * is known.
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the orientation.
 */
Orientation.prototype.getCurrentOrientation = function(successCallback, errorCallback) {
	if (typeof successCallback != 'function')
		successCallback = function () {};
	if (typeof errorCallback != 'function')
		errorCallback = function () {};
	
	if (!this.started)
		this.start(successCallback);
	else if (this.currentOrientation)
		successCallback(this.currentOrientation);
	else
		errorCallback();
};

Orientation.prototype.start = function (successCallback) {
	var that = this;
	Mojo.Event.listen(document, "orientationchange", function(event) {
		var orient = null;
		switch (event.position) {
			case 0: orient = "faceUp"; break;
			case 1: orient = "faceDown"; break;
			case 2: orient = "portrait"; break;
			case 3: orient = "portraitReverse"; break;
			case 4: orient = "landscapeRightUp"; break;
			case 5: orient = "landscapeLeftUp"; break;
			//orientationchange event seems to get thrown sometimes with a null event position
			default: return;
		}
		that.setOrientation(orient);
		successCallback(orient);
	});
	this.started = true;
}

/**
 * Asynchronously aquires the orientation repeatedly at a given interval.
 * @param {Function} successCallback The function to call each time the orientation
 * data is available.
 * @param {Function} errorCallback The function to call when there is an error 
 * getting the orientation data.
 */
Orientation.prototype.watchOrientation = function(successCallback, errorCallback, options) {
	// Invoke the appropriate callback with a new Position object every time the implementation 
	// determines that the position of the hosting device has changed. 
	this.getCurrentOrientation(successCallback, errorCallback);
	var interval = 1000;
	if (options && !isNaN(options.interval))
		interval = options.interval;
	var that = this;
	return setInterval(function() {
		that.getCurrentOrientation(successCallback, errorCallback);
	}, interval);
};

/**
 * Clears the specified orientation watch.
 * @param {String} watchId The ID of the watch returned from #watchOrientation.
 */
Orientation.prototype.clearWatch = function(watchId) {
	clearInterval(watchId);
};

if (typeof navigator.orientation == "undefined") navigator.orientation = new Orientation();

function Position(coords) {
	this.coords = coords;
    this.timestamp = new Date().getTime();
}

function Coordinates(lat, lng, alt, acc, head, vel) {
	/**
	 * The latitude of the position.
	 */
	this.latitude = lat;
	/**
	 * The longitude of the position,
	 */
	this.longitude = lng;
	/**
	 * The accuracy of the position.
	 */
	this.accuracy = acc;
	/**
	 * The altitude of the position.
	 */
	this.altitude = alt;
	/**
	 * The direction the device is moving at the position.
	 */
	this.heading = head;
	/**
	 * The velocity with which the device is moving at the position.
	 */
	this.speed = vel;
}

/**
 * This class specifies the options for requesting position data.
 * @constructor
 */
function PositionOptions() {
	/**
	 * Specifies the desired position accuracy.
	 */
	this.enableHighAccuracy = true;
	/**
	 * The timeout after which if position data cannot be obtained the errorCallback
	 * is called.
	 */
	this.timeout = 10000;
}

/**
 * This class contains information about any GSP errors.
 * @constructor
 */
function PositionError() {
	this.code = null;
	this.message = "";
}

PositionError.UNKNOWN_ERROR = 0;
PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;